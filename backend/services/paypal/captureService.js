import { paypalApiRequest } from './paypalClient.js';

/**
 * PayPal Capture & Refund Service (Payments v2 API)
 * Captures authorized funds after verification approval and executes eligible refunds.
 */

/**
 * Captures an authorized payment via PayPal Payments v2 API.
 * 
 * @param {string} authorizationId PayPal Authorization ID to capture
 * @param {object} params
 * @param {number} params.amount Amount to capture (must not exceed authorized amount)
 * @param {string} [params.currency] Currency code (default USD)
 * @param {boolean} [params.isFinal] Whether this is the final capture for the authorization (default true)
 * @param {string} [params.note] Note for payer
 * @param {string} [params.idempotencyKey] Unique key to prevent duplicate capture requests
 * @returns {Promise<object>} Capture result with captureId, status COMPLETED, and timestamp
 */
export const captureAuthorization = async (
  authorizationId,
  {
    amount,
    currency = 'USD',
    isFinal = true,
    note = null,
    idempotencyKey = null,
  } = {}
) => {
  if (!authorizationId) {
    throw new Error('PayPal authorization ID is required for capture.');
  }

  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, ''));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid capture amount "${amount}". Must be a positive numeric value.`);
  }

  const formattedAmount = numericAmount.toFixed(2);
  const key = idempotencyKey || `capture-${authorizationId}`;

  const capturePayload = {
    amount: {
      value: formattedAmount,
      currency_code: (currency || 'USD').toUpperCase().trim(),
    },
    final_capture: Boolean(isFinal),
  };

  if (note) {
    capturePayload.note_to_payer = String(note).slice(0, 255);
  }

  const response = await paypalApiRequest(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    {
      method: 'POST',
      body: capturePayload,
      idempotencyKey: key,
    }
  );

  return {
    captureId: response.id,
    status: response.status, // Typically "COMPLETED" or "PENDING"
    amount: parseFloat(response.amount?.value || formattedAmount),
    currency: response.amount?.currency_code || currency,
    isFinal: response.final_capture,
    createTime: response.create_time ? new Date(response.create_time) : new Date(),
    updateTime: response.update_time ? new Date(response.update_time) : new Date(),
    rawCapture: response,
  };
};

/**
 * Retrieves details for a specific PayPal capture.
 * 
 * @param {string} captureId PayPal Capture ID
 * @returns {Promise<object>} Complete capture record
 */
export const getCaptureDetails = async (captureId) => {
  if (!captureId) {
    throw new Error('PayPal capture ID is required.');
  }
  return paypalApiRequest(`/v2/payments/captures/${captureId}`, {
    method: 'GET',
  });
};

/**
 * Refunds a previously captured payment.
 * 
 * @param {string} captureId PayPal Capture ID to refund
 * @param {object} [params]
 * @param {number} [params.amount] Partial refund amount (if omitted, full amount is refunded)
 * @param {string} [params.currency] Currency code
 * @param {string} [params.note] Reason for refund
 * @param {string} [params.idempotencyKey] Key to prevent duplicate refunds
 * @returns {Promise<object>} Refund record
 */
export const refundCapture = async (
  captureId,
  {
    amount = null,
    currency = 'USD',
    note = null,
    idempotencyKey = null,
  } = {}
) => {
  if (!captureId) {
    throw new Error('PayPal capture ID is required to initiate a refund.');
  }

  const key = idempotencyKey || `refund-${captureId}-${Date.now()}`;
  const refundPayload = {};

  if (amount !== null && amount !== undefined) {
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (!isNaN(numericAmount) && numericAmount > 0) {
      refundPayload.amount = {
        value: numericAmount.toFixed(2),
        currency_code: (currency || 'USD').toUpperCase().trim(),
      };
    }
  }

  if (note) {
    refundPayload.note_to_payer = String(note).slice(0, 255);
  }

  const response = await paypalApiRequest(`/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    body: Object.keys(refundPayload).length > 0 ? refundPayload : null,
    idempotencyKey: key,
  });

  return {
    refundId: response.id,
    status: response.status, // Typically "COMPLETED"
    amount: parseFloat(response.amount?.value || '0'),
    currency: response.amount?.currency_code || currency,
    createTime: response.create_time ? new Date(response.create_time) : new Date(),
    rawRefund: response,
  };
};

