import { request, ApiError } from '../../shared/services/httpClient';

const getWorkerToken = () => {
  try {
    return localStorage.getItem('realityproof_worker_token') || null;
  } catch {
    return null;
  }
};

const workerRequest = (endpoint, options = {}) => request(endpoint, options, getWorkerToken);

export const workerApi = {
  // Public Auth
  login: async (credentials) => {
    return await request('/worker/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getDemoList: async () => {
    const res = await request('/worker/demo-list');
    return res.data || res;
  },

  // Protected Worker Portal APIs
  getMe: async () => {
    const res = await workerRequest('/worker/me');
    return res.data || res;
  },

  getTasks: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.category && params.category !== 'All') searchParams.append('category', params.category);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await workerRequest(`/worker/tasks${queryString}`);
    return res.data || res;
  },

  getTaskById: async (id) => {
    const res = await workerRequest(`/worker/tasks/${id}`);
    return res.data || res;
  },

  getSubmissions: async () => {
    const res = await workerRequest('/worker/submissions');
    return res.data || res;
  },

  // Evidence capture & upload
  uploadEvidence: async (formData) => {
    const res = await workerRequest('/evidence/upload', {
      method: 'POST',
      body: formData,
      timeout: 35000,
    });
    return res.data || res;
  },

  submitEvidence: async (payload) => {
    const res = await workerRequest('/evidence/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 45000,
    });
    return res.data || res;
  },
};

export { ApiError };
export default workerApi;
