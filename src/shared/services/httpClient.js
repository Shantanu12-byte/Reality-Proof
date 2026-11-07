// Shared HTTP Client with robust error handling and timeout support

const rawBase = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
const API_BASE = rawBase.startsWith('http') && !rawBase.endsWith('/api') ? `${rawBase}/api` : rawBase;
const TIMEOUT_MS = 25000;

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request(endpoint, options = {}, tokenGetter = null) {
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

  // Attach auth token if provided by token getter or options
  const token = typeof tokenGetter === 'function' ? tokenGetter() : (options.token || null);
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
      `Cannot connect to RealityProof backend (${error.message}). Is the backend server running?`,
      0
    );
  }
}
