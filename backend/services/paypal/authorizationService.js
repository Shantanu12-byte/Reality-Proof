import { paypalApiRequest } from './paypalClient.js';

/**
 * PayPal Authorization Service (Payments v2 API)
 * Handles authorizing buyer-approved orders, inspecting authorization validity,
 * and voiding authorizations.
 */

/**
 * Authorizes payment for an approved PayPal order.
 * 
 * @param {string} orderId PayPal Order ID approved by the buyer
 * @param {object} [options]
 * @param {string} [options.idempotencyKey] Unique key to prevent duplicate authorization requests
 * @returns {Promise<object>} Authorization details including authorization ID, status, and expiration
 */
export const authorizeOrder = async (orderId, { idempotencyKey = null } = {}) => {
  if (!orderId) {
    throw new Error('PayPal order ID is required to authorize the payment.');
  }

  const key = idempotencyKey || `auth-${orderId}`;

  const response = await paypalApiRequest(`/v2/checkout/orders/${orderId}/authorize`, {
    method: 'POST',
    idempotencyKey: key,
  });

  const authorizationData = response.purchase_units?.[0]?.payments?.authorizations?.[0];

  if (!authorizationData) {
    throw new Error(
      `No authorization found in PayPal response for order "${orderId}". Current order status: ${response.status}`
    );
  }

  const expirationDate = authorizationData.expiration_time
    ? new Date(authorizationData.expiration_time)
    : new Date(Date.now() + 29 * 24 * 60 * 60 * 1000); // 29-day standard window fallback

  return {
    authorizationId: authorizationData.id,
    orderId: response.id,
    status: authorizationData.status, // Typically "CREATED"
    amount: parseFloat(authorizationData.amount?.value || '0'),
    currency: authorizationData.amount?.currency_code || 'USD',
    expirationTime: expirationDate,
    createTime: authorizationData.create_time ? new Date(authorizationData.create_time) : new Date(),
    links: authorizationData.links || [],
    rawAuthorization: authorizationData,
    rawOrder: response,
  };
};

/**
 * Retrieves authorization status and details from PayPal.
 * 
 * @param {string} authorizationId PayPal Authorization ID
 * @returns {Promise<object>} Complete authorization record
 */
export const getAuthorizationDetails = async (authorizationId) => {
  if (!authorizationId) {
    throw new Error('PayPal authorization ID is required.');
  }
  return paypalApiRequest(`/v2/payments/authorizations/${authorizationId}`, {
    method: 'GET',
  });
};

/**
 * Voids an active payment authorization.
 * 
 * @param {string} authorizationId PayPal Authorization ID
 * @param {object} [options]
 * @param {string} [options.idempotencyKey] Key to prevent duplicate voids
 * @returns {Promise<object>}
 */
export const voidAuthorization = async (authorizationId, { idempotencyKey = null } = {}) => {
  if (!authorizationId) {
    throw new Error('PayPal authorization ID is required to void.');
  }

  const key = idempotencyKey || `void-${authorizationId}`;

  await paypalApiRequest(`/v2/payments/authorizations/${authorizationId}/void`, {
    method: 'POST',
    idempotencyKey: key,
  });

  return {
    authorizationId,
    status: 'VOIDED',
    voidedAt: new Date(),
  };
};

