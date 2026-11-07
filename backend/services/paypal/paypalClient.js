import { getOAuthAccessToken } from './accessToken.js';

/**
 * PayPal API Configuration & Client Module
 * Official PayPal REST v2 endpoints with OAuth 2.0 authentication,
 * environment switching (sandbox/live), and automatic idempotency key handling.
 */

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE_URL = 'https://api-m.paypal.com';

/**
 * Returns the active PayPal REST API base URL based on PAYPAL_MODE.
 */
export const getPayPalBaseUrl = () => {
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
  return mode === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;
};

/**
 * Returns sanitized configuration details safe for clients and internal checks.
 */
export const getPayPalConfig = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
  const currency = (process.env.PAYPAL_CURRENCY || 'USD').toUpperCase().trim();
  const payoutsEnabled = process.env.PAYPAL_PAYOUTS_ENABLED === 'true';

  const isConfigured = Boolean(
    clientId &&
    clientSecret &&
    !clientId.includes('YOUR_PAYPAL') &&
    !clientSecret.includes('YOUR_PAYPAL')
  );

  return {
    mode,
    baseUrl: mode === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL,
    currency,
    payoutsEnabled,
    isConfigured,
    hasWebhook: Boolean(webhookId && !webhookId.includes('YOUR_PAYPAL')),
    clientId: isConfigured ? clientId : '',
    webhookId: isConfigured ? webhookId : '',
  };
};

/**
 * Generic request wrapper for PayPal REST APIs.
 * Automatically injects OAuth 2.0 Bearer token, application/json headers,
 * and PayPal-Request-Id for operations requiring idempotency.
 */
export const paypalApiRequest = async (
  endpoint,
  {
    method = 'GET',
    body = null,
    headers = {},
    idempotencyKey = null,
    useAuth = true,
  } = {}
) => {
  const baseUrl = getPayPalBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (useAuth) {
    const accessToken = await getOAuthAccessToken();
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  // Idempotency: PayPal uses PayPal-Request-Id header to prevent duplicate mutations
  if (idempotencyKey) {
    requestHeaders['PayPal-Request-Id'] = String(idempotencyKey);
  }

  const options = {
    method,
    headers: requestHeaders,
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text ? { raw: text } : null;
    }
  }

  if (!response.ok) {
    const errorDetails = data?.details
      ? data.details.map((d) => `${d.issue || d.field || ''}: ${d.description || ''}`).join('; ')
      : data?.message || data?.error_description || response.statusText;

    const error = new Error(`PayPal API Error [${response.status} ${data?.name || 'Error'}]: ${errorDetails}`);
    error.status = response.status;
    error.paypalData = data;
    error.name = data?.name || 'PayPalApiError';
    throw error;
  }

  return data;
};

