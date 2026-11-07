/**
 * PayPal OAuth 2.0 Access Token Service
 * Implements token retrieval with in-memory caching and proactive refresh
 * before token expiration (using grant_type=client_credentials).
 */

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE_URL = 'https://api-m.paypal.com';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Resets the in-memory token cache (useful for testing or after credential rotation).
 */
export const resetAccessTokenCache = () => {
  cachedToken = null;
  tokenExpiresAt = 0;
};

/**
 * Obtains an OAuth 2.0 access token from PayPal using client credentials.
 * Automatically caches the token and re-uses it until 60 seconds before expiration.
 * 
 * @returns {Promise<string>} Valid PayPal OAuth 2.0 access token
 */
export const getOAuthAccessToken = async () => {
  const now = Date.now();

  // Return cached token if valid with at least 60 seconds remaining margin
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret || clientId.includes('YOUR_PAYPAL')) {
    throw new Error(
      'PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env'
    );
  }

  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
  const baseUrl = mode === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;
  const tokenUrl = `${baseUrl}/v1/oauth2/token`;

  const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const errorMsg = data.error_description || data.error || 'Failed to authenticate with PayPal OAuth 2.0';
    throw new Error(`PayPal OAuth Authentication Error [${response.status}]: ${errorMsg}`);
  }

  cachedToken = data.access_token;
  const expiresInMs = (data.expires_in || 32400) * 1000;
  tokenExpiresAt = now + expiresInMs;

  return cachedToken;
};

