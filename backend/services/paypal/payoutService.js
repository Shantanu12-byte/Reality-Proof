import { paypalApiRequest, getPayPalConfig } from './paypalClient.js';

/**
 * PayPal Payouts & Worker Settlement Service
 * Manages worker earnings settlements. Uses PayPal Payouts API only when
 * explicitly enabled and permitted; otherwise supports authenticated manual
 * settlement tracking with full audit records.
 * 
 * IMPORTANT: Captured merchant funds are NOT worker payouts.
 * Worker settlement is a distinct, verifiable secondary transaction.
 */

/**
 * Checks whether PayPal Payouts API is enabled in configuration.
 */
export const isPayoutsApiEnabled = () => {
  return process.env.PAYPAL_PAYOUTS_ENABLED === 'true';
};

/**
 * Creates a worker payout via PayPal Payouts API (if enabled).
 * 
 * @param {object} params
 * @param {string} params.recipientEmail Worker's verified PayPal account email
 * @param {number} params.amount Payout amount
 * @param {string} [params.currency] Currency code
 * @param {string} [params.note] Note for recipient
 * @param {string} [params.senderItemId] Unique identifier for the item (e.g. paymentId)
 * @returns {Promise<object>} Payout batch details
 */
export const createWorkerPayout = async ({
  recipientEmail,
  amount,
  currency = 'USD',
  note = null,
  senderItemId = null,
}) => {
  if (!isPayoutsApiEnabled()) {
    throw new Error(
      'PayPal Payouts API is not enabled on this account. Set PAYPAL_PAYOUTS_ENABLED=true in backend/.env only if your PayPal business account has been approved for Payouts.'
    );
  }

  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error('A valid recipient PayPal email is required for payout dispatch.');
  }

  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, ''));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid payout amount "${amount}". Must be a positive numeric value.`);
  }

  const formattedAmount = numericAmount.toFixed(2);
  const senderBatchId = `payout-batch-${senderItemId || Date.now()}-${Math.round(Math.random() * 1000)}`;

  const payoutPayload = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: 'RealityProof: Inspection Task Payment Dispatched',
      email_message: note || 'You have received payment for completing a verified field inspection task on RealityProof.',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: formattedAmount,
          currency: (currency || 'USD').toUpperCase().trim(),
        },
        note: note || 'Inspection task payout',
        sender_item_id: senderItemId || `item-${Date.now()}`,
        receiver: recipientEmail.trim(),
      },
    ],
  };

  const response = await paypalApiRequest('/v1/payments/payouts', {
    method: 'POST',
    body: payoutPayload,
    idempotencyKey: senderBatchId,
  });

  return {
    payoutBatchId: response.batch_header?.payout_batch_id,
    batchStatus: response.batch_header?.batch_status, // Typically "PENDING"
    senderBatchId,
    amount: numericAmount,
    currency,
    recipientEmail,
    links: response.links || [],
    rawPayout: response,
  };
};

/**
 * Retrieves details of a payout batch by batch ID.
 * 
 * @param {string} payoutBatchId PayPal Payout Batch ID
 * @returns {Promise<object>} Batch status and item details
 */
export const getPayoutBatchDetails = async (payoutBatchId) => {
  if (!payoutBatchId) {
    throw new Error('PayPal payout batch ID is required.');
  }
  return paypalApiRequest(`/v1/payments/payouts/${payoutBatchId}`, {
    method: 'GET',
  });
};

