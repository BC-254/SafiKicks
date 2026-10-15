import client from './client';

export const ownerApi = {
  // Executive Dashboard KPIs and summary
  getDashboard: async () => {
    const res = await client.get('/owner/dashboard');
    return res.data;
  },

  // Paginated and filterable jobs list
  getJobs: async (params = {}) => {
    const res = await client.get('/owner/jobs', { params });
    return res.data;
  },

  // Detailed single job inspection
  getJobDetail: async (id) => {
    const res = await client.get(`/owner/jobs/${id}`);
    return res.data;
  },

  // Daily operations & financial report
  getDailyReport: async (date = null) => {
    const res = await client.get('/owner/reports/daily', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  // Submit daily cash close
  submitDayClose: async (data) => {
    const res = await client.post('/owner/day-close', data);
    return res.data;
  },

  // Daily cash close history
  getDayCloseHistory: async () => {
    const res = await client.get('/owner/day-close/history');
    return res.data;
  },

  // 30-day SMS volume analytics
  getSmsVolume: async () => {
    const res = await client.get('/owner/sms-volume');
    return res.data;
  },

  // Paginated immutable audit trail feed
  getAuditFeed: async (params = {}) => {
    const res = await client.get('/owner/audit', { params });
    return res.data;
  },

  // Single job audit timeline
  getJobAuditTimeline: async (id) => {
    const res = await client.get(`/owner/jobs/${id}/audit`);
    return res.data;
  },
};
