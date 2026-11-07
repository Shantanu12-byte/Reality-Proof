import { paypalApiRequest, getPayPalConfig } from './paypalClient.js';

/**
 * PayPal Order Service (REST Orders v2 API)
 * Creates orders with intent: 'AUTHORIZE' for task inspection budget pre-authorization.
 */

/**
 * Creates a PayPal order with intent: 'AUTHORIZE' for a specific task budget.
 * 
 * @param {object} params
 * @param {string} params.taskId RealityProof task identifier (e.g. RP-1001)
 * @param {number} params.amount Task budget amount
 * @param {string} [params.currency] Currency code (default from env or USD)
 * @param {string} [params.description] Brief task summary
 * @param {string} [params.paymentId] Internal payment identifier for custom_id / idempotency
 * @param {string} [params.returnUrl] Frontend return URL upon approval
 * @param {string} [params.cancelUrl] Frontend cancel URL
 * @returns {Promise<object>} Created PayPal order with approval URL and order ID
 */
export const createAuthorizationOrder = async ({
  taskId,
  amount,
  currency = null,
  description = null,
  paymentId = null,
  returnUrl = null,
  cancelUrl = null,
}) => {
  const config = getPayPalConfig();
  const selectedCurrency = (currency || config.currency || 'USD').toUpperCase().trim();
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, ''));

  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid payment amount "${amount}". Must be a positive numeric value.`);
  }

  const formattedAmount = numericAmount.toFixed(2);
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  const orderPayload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: taskId,
        description: description || `RealityProof Inspection Task ${taskId} Budget Authorization`,
        custom_id: paymentId || taskId,
        amount: {
          currency_code: selectedCurrency,
          value: formattedAmount,
        },
      },
    ],
    application_context: {
      brand_name: 'RealityProof Verification Platform',
      landing_page: 'NO_PREFERENCE',
      user_action: 'CONTINUE',
      return_url: returnUrl || `${clientUrl}/payments?taskId=${taskId}&orderApproved=true`,
      cancel_url: cancelUrl || `${clientUrl}/payments?taskId=${taskId}&orderCancelled=true`,
    },
  };

  const idempotencyKey = paymentId ? `order-${paymentId}` : `order-${taskId}-${Date.now()}`;

  const response = await paypalApiRequest('/v2/checkout/orders', {
    method: 'POST',
    body: orderPayload,
    idempotencyKey,
  });

  const approvalLink = response.links?.find((link) => link.rel === 'approve');

  return {
    orderId: response.id,
    status: response.status,
    intent: response.intent || 'AUTHORIZE',
    amount: numericAmount,
    currency: selectedCurrency,
    approvalUrl: approvalLink?.href || '',
    links: response.links || [],
    rawOrder: response,
  };
};

/**
 * Retrieves PayPal order details by order ID.
 * 
 * @param {string} orderId PayPal Order ID
 * @returns {Promise<object>} Complete order details from PayPal
 */
export const getOrderDetails = async (orderId) => {
  if (!orderId) {
    throw new Error('PayPal order ID is required to retrieve order details.');
  }
  return paypalApiRequest(`/v2/checkout/orders/${orderId}`, {
    method: 'GET',
  });
};
