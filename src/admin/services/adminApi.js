import { request, ApiError } from '../../shared/services/httpClient';

const getAdminToken = () => {
  try {
    return localStorage.getItem('realityproof_admin_token') || null;
  } catch {
    return null;
  }
};

const adminRequest = (endpoint, options = {}) => request(endpoint, options, getAdminToken);

export const adminApi = {
  // Auth
  login: async (credentials) => {
    return await request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getMe: async () => {
    const res = await adminRequest('/admin/me');
    return res.data || res.admin || res;
  },

  // Health
  checkHealth: async () => {
    try {
      const res = await request('/health');
      return { isOnline: true, mongodb: res.mongodb === 'connected', timestamp: res.timestamp };
    } catch (err) {
      return { isOnline: false, mongodb: false, error: err.message };
    }
  },

  // Tasks
  tasks: {
    getAll: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.status && params.status !== 'All') searchParams.append('status', params.status);
      if (params.city && params.city !== 'All') searchParams.append('city', params.city);
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await adminRequest(`/tasks${queryString}`);
      return res.data || res;
    },
    getById: async (id) => {
      const res = await adminRequest(`/tasks/${id}`);
      return res.data || res;
    },
    create: async (taskData) => {
      const res = await adminRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      return res.data || res;
    },
    update: async (id, updateData) => {
      const res = await adminRequest(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return res.data || res;
    },
    delete: async (id) => {
      return await adminRequest(`/tasks/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Workers
  workers: {
    getAll: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.city && params.city !== 'All') searchParams.append('city', params.city);
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await adminRequest(`/workers${queryString}`);
      return res.data || res;
    },
    getById: async (id) => {
      const res = await adminRequest(`/workers/${id}`);
      return res.data || res;
    },
    create: async (workerData) => {
      const res = await adminRequest('/workers', {
        method: 'POST',
        body: JSON.stringify(workerData),
      });
      return res.data || res;
    },
    update: async (id, updateData) => {
      const res = await adminRequest(`/workers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return res.data || res;
    },
  },

  // Dashboard
  dashboard: {
    getSummary: async () => {
      const res = await adminRequest('/dashboard/summary');
      return res.data || res;
    },
    getActivity: async (limit = 15) => {
      const res = await adminRequest(`/dashboard/activity?limit=${limit}`);
      return res.data || res;
    },
    getExceptions: async () => {
      const res = await adminRequest('/dashboard/exceptions');
      return res.data || res;
    },
  },

  // Verifications
  verifications: {
    getAll: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'All') searchParams.append('status', params.status);
      if (params.recommendation && params.recommendation !== 'All') searchParams.append('recommendation', params.recommendation);
      if (params.riskCategory && params.riskCategory !== 'All') searchParams.append('riskCategory', params.riskCategory);
      if (params.search) searchParams.append('search', params.search);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.page) searchParams.append('page', params.page);
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await adminRequest(`/verifications${queryString}`);
      return res.data || res;
    },
    getLatest: async (taskId) => {
      const res = await adminRequest(`/verifications/${taskId}`);
      return res.data || res;
    },
    getHistory: async (taskId) => {
      const res = await adminRequest(`/verifications/${taskId}/history`);
      return res.data || res;
    },
    analyze: async (taskId, payload) => {
      const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
      const res = await adminRequest(`/verifications/${taskId}/analyze`, {
        method: 'POST',
        body: isFormData ? payload : JSON.stringify(payload),
        timeout: 30000,
      });
      return res.data || res;
    },
    retry: async (id) => {
      const res = await adminRequest(`/verifications/${id}/retry`, {
        method: 'POST',
        timeout: 30000,
      });
      return res.data || res;
    },
    review: async (id, reviewData) => {
      const res = await adminRequest(`/verifications/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(reviewData),
      });
      return res.data || res;
    },
  },

  // Payments
  payments: {
    getConfig: async () => {
      const res = await request('/payments/config');
      return res.data || res;
    },
    getSummary: async () => {
      const res = await adminRequest('/payments/summary');
      return res.data || res;
    },
    getTransactions: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'All') searchParams.append('status', params.status);
      if (params.limit) searchParams.append('limit', params.limit);
      if (params.search) searchParams.append('search', params.search);
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await adminRequest(`/payments/transactions${queryString}`);
      return res.data || res;
    },
    getAll: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'All') searchParams.append('status', params.status);
      if (params.authorizationStatus && params.authorizationStatus !== 'All') searchParams.append('authorizationStatus', params.authorizationStatus);
      if (params.captureStatus && params.captureStatus !== 'All') searchParams.append('captureStatus', params.captureStatus);
      if (params.payoutStatus && params.payoutStatus !== 'All') searchParams.append('payoutStatus', params.payoutStatus);
      if (params.search) searchParams.append('search', params.search);
      if (params.page) searchParams.append('page', params.page);
      if (params.limit) searchParams.append('limit', params.limit);
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await adminRequest(`/payments${queryString}`);
      return res;
    },
    getById: async (paymentId) => {
      const res = await adminRequest(`/payments/${paymentId}`);
      return res.data || res;
    },
    getByTaskId: async (taskId) => {
      const res = await adminRequest(`/payments/tasks/${taskId}`);
      return res.data || res;
    },
    createOrder: async (taskId, payload = {}) => {
      const res = await adminRequest(`/payments/tasks/${taskId}/create-order`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data || res;
    },
    authorize: async (paymentId, payload = {}) => {
      const res = await adminRequest(`/payments/${paymentId}/authorize`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data || res;
    },
    capture: async (paymentId, payload = {}) => {
      const res = await adminRequest(`/payments/${paymentId}/capture`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data || res;
    },
    refund: async (paymentId, payload = {}) => {
      const res = await adminRequest(`/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data || res;
    },
    payout: async (paymentId, payload = {}) => {
      const res = await adminRequest(`/payments/${paymentId}/payout`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data || res;
    },
    release: async (id) => {
      const res = await adminRequest(`/payments/release/${id}`, {
        method: 'POST',
      });
      return res.data || res;
    },
  },

  // Intelligence
  intelligence: {
    getSummary: async () => {
      const res = await adminRequest('/intelligence/summary');
      return res.data || res;
    },
  },

  // Telemetry
  telemetry: {
    getLocations: async () => {
      const res = await adminRequest('/telemetry/locations');
      return res.data || res;
    },
  },
};

export { ApiError };
export default adminApi;
