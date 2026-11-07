// RealityProof Resilient API Service
// Connects to Express + MongoDB backend with automatic proxy or environment URL,
// timeout detection, and fallback handling for network interruptions.

const rawBase = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
const API_BASE = rawBase.startsWith('http') && !rawBase.endsWith('/api') ? `${rawBase}/api` : rawBase;
const TIMEOUT_MS = 15000;

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeout = options.timeout || TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const defaultHeaders = isFormData
    ? { Accept: 'application/json' }
    : {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

  let token = options.token || null;
  if (!token && typeof localStorage !== 'undefined') {
    const adminToken = localStorage.getItem('realityproof_admin_token');
    const workerToken = localStorage.getItem('realityproof_worker_token');
    if (endpoint.startsWith('/worker') || endpoint.startsWith('/evidence')) {
      token = workerToken || adminToken;
    } else {
      token = adminToken || workerToken;
    }
  }

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...authHeaders,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new ApiError(
        data?.message || `Request failed with HTTP status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Backend may be offline or slow to respond.', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      `Cannot connect to RealityProof backend (${error.message}). Is the backend server running on port 5000?`,
      0
    );
  }
}

// 1. Health check
export const checkBackendHealth = async () => {
  try {
    const res = await request('/health');
    return { isOnline: true, mongodb: res.mongodb === 'connected', timestamp: res.timestamp };
  } catch (err) {
    return { isOnline: false, mongodb: false, error: err.message };
  }
};

// Admin Auth APIs
export const adminAuthApi = {
  login: async (credentials) => {
    return await request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  getMe: async () => {
    const res = await request('/admin/me');
    return res.data || res.admin || res;
  },
};

// 2. Task APIs
export const taskApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.city && params.city !== 'All') searchParams.append('city', params.city);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request(`/tasks${queryString}`);
    return res.data || res;
  },

  getById: async (id) => {
    const res = await request(`/tasks/${id}`);
    return res.data || res;
  },

  create: async (taskData) => {
    const res = await request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return res.data || res;
  },

  update: async (id, updateData) => {
    const res = await request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return res.data || res;
  },

  delete: async (id) => {
    const res = await request(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};

// 3. Worker APIs
export const workerApi = {
  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.city && params.city !== 'All') searchParams.append('city', params.city);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request(`/workers${queryString}`);
    return res.data || res;
  },

  getById: async (id) => {
    const res = await request(`/workers/${id}`);
    return res.data || res;
  },

  create: async (workerData) => {
    const res = await request('/workers', {
      method: 'POST',
      body: JSON.stringify(workerData),
    });
    return res.data || res;
  },

  update: async (id, updateData) => {
    const res = await request(`/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return res.data || res;
  },
};

// 4. Dashboard APIs
export const dashboardApi = {
  getSummary: async () => {
    const res = await request('/dashboard/summary');
    return res.data || res;
  },

  getActivity: async (limit = 15) => {
    const res = await request(`/dashboard/activity?limit=${limit}`);
    return res.data || res;
  },

  getExceptions: async () => {
    const res = await request('/dashboard/exceptions');
    return res.data || res;
  },
};

// 5. Payment APIs (Phase 6 Real PayPal REST v2 Integration)
export const paymentApi = {
  getConfig: async () => {
    const res = await request('/payments/config');
    return res.data || res;
  },

  getSummary: async () => {
    const res = await request('/payments/summary');
    return res.data || res;
  },

  getTransactions: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.search) searchParams.append('search', params.search);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request(`/payments/transactions${queryString}`);
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
    const res = await request(`/payments${queryString}`);
    return res;
  },

  getById: async (paymentId) => {
    const res = await request(`/payments/${paymentId}`);
    return res.data || res;
  },

  getByTaskId: async (taskId) => {
    const res = await request(`/payments/tasks/${taskId}`);
    return res.data || res;
  },

  createOrder: async (taskId, payload = {}) => {
    const res = await request(`/payments/tasks/${taskId}/create-order`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  authorize: async (paymentId, payload = {}) => {
    const res = await request(`/payments/${paymentId}/authorize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  capture: async (paymentId, payload = {}) => {
    const res = await request(`/payments/${paymentId}/capture`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  refund: async (paymentId, payload = {}) => {
    const res = await request(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  payout: async (paymentId, payload = {}) => {
    const res = await request(`/payments/${paymentId}/payout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  release: async (id) => {
    const res = await request(`/payments/release/${id}`, {
      method: 'POST',
    });
    return res.data || res;
  },
};

// 6. Telemetry APIs
export const telemetryApi = {
  getLocations: async () => {
    const res = await request('/telemetry/locations');
    return res.data || res;
  },
};

// 7. Intelligence APIs
export const intelligenceApi = {
  getSummary: async () => {
    const res = await request('/intelligence/summary');
    return res.data || res;
  },
};

// 8. Verification APIs (Phase 4 Real AI Vision Engine)
export const verificationApi = {
  analyze: async (taskId, payload) => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const res = await request(`/verifications/${taskId}/analyze`, {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload),
      timeout: 30000, // 30s timeout for vision AI processing
    });
    return res.data || res;
  },

  getLatest: async (taskId) => {
    const res = await request(`/verifications/${taskId}`);
    return res.data || res;
  },

  getHistory: async (taskId) => {
    const res = await request(`/verifications/${taskId}/history`);
    return res.data || res;
  },

  getAll: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.recommendation && params.recommendation !== 'All') searchParams.append('recommendation', params.recommendation);
    if (params.riskCategory && params.riskCategory !== 'All') searchParams.append('riskCategory', params.riskCategory);
    if (params.search) searchParams.append('search', params.search);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.page) searchParams.append('page', params.page);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request(`/verifications${queryString}`);
    return res.data || res;
  },

  retry: async (id) => {
    const res = await request(`/verifications/${id}/retry`, {
      method: 'POST',
      timeout: 30000,
    });
    return res.data || res;
  },

  review: async (id, reviewData) => {
    const res = await request(`/verifications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
    return res.data || res;
  },
};

// 9. Worker Portal APIs (Mobile-First Worker Experience)
export const workerPortalApi = {
  login: async (credentials) => {
    const res = await request('/worker/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return res;
  },

  getDemoList: async () => {
    const res = await request('/worker/demo-list');
    return res.data || res;
  },

  getMe: async (workerId) => {
    const headers = workerId ? { 'x-worker-id': workerId } : {};
    const res = await request('/worker/me', { headers });
    return res.data || res;
  },

  getTasks: async (workerId, params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.category && params.category !== 'All') searchParams.append('category', params.category);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const headers = workerId ? { 'x-worker-id': workerId } : {};
    const res = await request(`/worker/tasks${queryString}`, { headers });
    return res.data || res;
  },

  getTaskById: async (workerId, id) => {
    const headers = workerId ? { 'x-worker-id': workerId } : {};
    const res = await request(`/worker/tasks/${id}`, { headers });
    return res.data || res;
  },

  getSubmissions: async (workerId) => {
    const headers = workerId ? { 'x-worker-id': workerId } : {};
    const res = await request('/worker/submissions', { headers });
    return res.data || res;
  },
};

// 10. Evidence Storage & Submission APIs
export const evidenceApi = {
  upload: async (formData) => {
    const res = await request('/evidence/upload', {
      method: 'POST',
      body: formData,
      timeout: 30000,
    });
    return res.data || res;
  },

  submit: async (workerId, payload) => {
    const headers = workerId ? { 'x-worker-id': workerId } : {};
    const res = await request('/evidence/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 45000,
    });
    return res.data || res;
  },
};

export { ApiError };


