import { paypalApiRequest, getPayPalConfig } from './paypalClient.js';
import { Payment } from '../../models/Payment.js';
import { Task } from '../../models/Task.js';
import { Worker } from '../../models/Worker.js';
import { Activity } from '../../models/Activity.js';
import { logger } from '../logger.js';

/**
 * PayPal Webhook Verification & Event Dispatcher
 * Verifies inbound webhook signatures with PayPal API to protect against spoofing,
 * performs event deduplication, and accurately executes payment state transitions.
 */

/**
 * Verifies an inbound webhook event signature using PayPal REST API.
 * 
 * @param {object} params
 * @param {object} params.headers Express req.headers object
 * @param {object} params.event Inbound JSON event body
 * @param {string} [params.rawBody] Raw request body buffer/string
 * @returns {Promise<boolean>} True if PayPal cryptographically verifies the webhook signature
 */
export const verifyWebhookSignature = async ({ headers, event, rawBody = null }) => {
  const config = getPayPalConfig();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';

  // If webhookId is not set in development, log a clear notice
  if (!webhookId || webhookId.includes('YOUR_PAYPAL')) {
    logger.warn(
      'PayPalWebhook',
      'PAYPAL_WEBHOOK_ID not configured in backend/.env. Signature verification skipped in development.'
    );
    return true;
  }

  // Extract PayPal transmission headers (case-insensitive lookup)
  const getHeader = (name) => {
    const lower = name.toLowerCase();
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) return headers[key];
    }
    return null;
  };

  const authAlgo = getHeader('paypal-auth-algo');
  const certUrl = getHeader('paypal-cert-url');
  const transmissionId = getHeader('paypal-transmission-id');
  const transmissionSig = getHeader('paypal-transmission-sig');
  const transmissionTime = getHeader('paypal-transmission-time');

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    logger.warn('PayPalWebhook', 'Inbound request missing required PayPal security headers.');
    return false;
  }

  const verificationPayload = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId.trim(),
    webhook_event: event,
  };

  try {
    const verificationResponse = await paypalApiRequest('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: verificationPayload,
    });

    const isVerified = verificationResponse.verification_status === 'SUCCESS';
    if (!isVerified) {
      logger.warn(
        'PayPalWebhook',
        `Signature verification failed: status "${verificationResponse.verification_status}"`
      );
    }
    return isVerified;
  } catch (err) {
    logger.error('PayPalWebhook', 'Signature verification API error:', { error: err.message });
    return false;
  }
};

/**
 * Processes a verified PayPal webhook event with idempotency deduplication.
 * 
 * @param {object} event PayPal webhook event object
 * @returns {Promise<object>} Processing outcome and updated records
 */
export const processWebhookEvent = async (event) => {
  if (!event || !event.event_type || !event.id) {
    throw new Error('Malformed webhook event: missing id or event_type');
  }

  const { id: eventId, event_type: eventType, resource = {}, summary = '' } = event;

  // 1. Event Deduplication: Check if eventId was already logged
  const alreadyProcessed = await Payment.findOne({ 'webhookEvents.eventId': eventId });
  if (alreadyProcessed) {
    logger.info('PayPalWebhook', `Duplicate event "${eventId}" (${eventType}) ignored.`);
    return {
      status: 'IGNORED_DUPLICATE',
      eventId,
      eventType,
      paymentId: alreadyProcessed.paymentId,
    };
  }

  logger.info('PayPalWebhook', `Processing event: ${eventType} (${eventId})`);

  let affectedPayment = null;

  // 2. Locate associated Payment document via resource identifiers
  const orderId = resource.id && eventType.startsWith('CHECKOUT.ORDER') ? resource.id : resource.supplementary_data?.related_ids?.order_id;
  const authorizationId = resource.id && eventType.startsWith('PAYMENT.AUTHORIZATION') ? resource.id : resource.supplementary_data?.related_ids?.authorization_id;
  const captureId = resource.id && eventType.startsWith('PAYMENT.CAPTURE') ? resource.id : resource.supplementary_data?.related_ids?.capture_id;
  const customId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;

  if (customId) {
    affectedPayment = await Payment.findOne({
      $or: [{ paymentId: customId }, { taskId: customId }],
    });
  }
  if (!affectedPayment && authorizationId) {
    affectedPayment = await Payment.findOne({ paypalAuthorizationId: authorizationId });
  }
  if (!affectedPayment && captureId) {
    affectedPayment = await Payment.findOne({ paypalCaptureId: captureId });
  }
  if (!affectedPayment && orderId) {
    affectedPayment = await Payment.findOne({ paypalOrderId: orderId });
  }

  // 3. Dispatch Event Specific Handlers
  switch (eventType) {
    case 'CHECKOUT.ORDER.APPROVED': {
      if (affectedPayment) {
        if (affectedPayment.paymentStatus === 'CREATED') {
          affectedPayment.paymentStatus = 'PENDING_APPROVAL';
        }
      }
      break;
    }

    case 'PAYMENT.AUTHORIZATION.CREATED': {
      if (affectedPayment) {
        affectedPayment.paypalAuthorizationId = resource.id;
        affectedPayment.authorizationStatus = 'CREATED';
        affectedPayment.paymentStatus = 'AUTHORIZED';
        affectedPayment.authorizedAt = resource.create_time ? new Date(resource.create_time) : new Date();
        if (resource.expiration_time) {
          affectedPayment.authorizationExpiresAt = new Date(resource.expiration_time);
        }

        // Sync with Task
        await Task.findOneAndUpdate(
          { taskId: affectedPayment.taskId },
          { paymentStatus: 'Authorized', paymentId: affectedPayment.paymentId }
        );

        await Activity.create({
          taskId: affectedPayment.taskId,
          activityType: 'PAYMENT_AUTHORIZED',
          title: 'PayPal Authorization Created',
          description: `Authorized $${affectedPayment.amount.toFixed(2)} USD via PayPal (Auth ID: ${resource.id}). Valid for 29 days.`,
          actor: 'PayPalWebhook',
          level: 'info',
          source: 'PayPalPaymentService',
        });
      }
      break;
    }

    case 'PAYMENT.AUTHORIZATION.VOIDED': {
      if (affectedPayment) {
        affectedPayment.authorizationStatus = 'VOIDED';
        affectedPayment.paymentStatus = 'CANCELLED';

        await Task.findOneAndUpdate(
          { taskId: affectedPayment.taskId },
          { paymentStatus: 'Not Eligible' }
        );

        await Activity.create({
          taskId: affectedPayment.taskId,
          activityType: 'PAYMENT_VOIDED',
          title: 'PayPal Authorization Voided',
          description: `Authorization ${resource.id} was voided for task ${affectedPayment.taskId}.`,
          actor: 'PayPalWebhook',
          level: 'warning',
          source: 'PayPalPaymentService',
        });
      }
      break;
    }

    case 'PAYMENT.CAPTURE.COMPLETED': {
      if (affectedPayment) {
        affectedPayment.paypalCaptureId = resource.id;
        affectedPayment.captureStatus = 'COMPLETED';
        affectedPayment.paymentStatus = 'CAPTURED';
        affectedPayment.capturedAt = resource.create_time ? new Date(resource.create_time) : new Date();

        // Sync with Task
        await Task.findOneAndUpdate(
          { taskId: affectedPayment.taskId },
          { paymentStatus: 'Completed', paymentId: affectedPayment.paymentId }
        );

        await Activity.create({
          taskId: affectedPayment.taskId,
          activityType: 'PAYMENT_CAPTURED',
          title: 'PayPal Payment Captured',
          description: `Captured $${affectedPayment.amount.toFixed(2)} USD (Capture ID: ${resource.id}) into merchant account following task verification approval.`,
          actor: 'PayPalWebhook',
          level: 'success',
          source: 'PayPalPaymentService',
        });
      }
      break;
    }

    case 'PAYMENT.CAPTURE.DENIED': {
      if (affectedPayment) {
        affectedPayment.captureStatus = 'FAILED';
        affectedPayment.paymentStatus = 'FAILED';
        affectedPayment.failureReason = resource.status_details?.reason || 'Capture denied by PayPal';

        await Activity.create({
          taskId: affectedPayment.taskId,
          activityType: 'PAYMENT_FAILED',
          title: 'PayPal Capture Denied',
          description: `Capture denied for task ${affectedPayment.taskId}: ${affectedPayment.failureReason}`,
          actor: 'PayPalWebhook',
          level: 'danger',
          source: 'PayPalPaymentService',
        });
      }
      break;
    }

    case 'PAYMENT.CAPTURE.REFUNDED': {
      if (affectedPayment) {
        affectedPayment.captureStatus = 'REFUNDED';
        affectedPayment.paymentStatus = 'REFUNDED';

        await Task.findOneAndUpdate(
          { taskId: affectedPayment.taskId },
          { paymentStatus: 'Refunded' }
        );

        await Activity.create({
          taskId: affectedPayment.taskId,
          activityType: 'PAYMENT_REFUNDED',
          title: 'PayPal Payment Refunded',
          description: `Refund completed for task ${affectedPayment.taskId} (Capture: ${affectedPayment.paypalCaptureId}).`,
          actor: 'PayPalWebhook',
          level: 'warning',
          source: 'PayPalPaymentService',
        });
      }
      break;
    }

    default:
      logger.info('PayPalWebhook', `Unhandled event type: ${eventType}`);
  }

  // 4. Log Webhook event on Payment document if located
  if (affectedPayment) {
    affectedPayment.webhookEvents.push({
      eventId,
      eventType,
      receivedAt: new Date(),
      summary: summary || `Webhook ${eventType} recorded`,
      resourceId: resource.id || '',
      status: 'PROCESSED',
    });
    await affectedPayment.save();
  }

  return {
    status: 'PROCESSED',
    eventId,
    eventType,
    paymentId: affectedPayment?.paymentId || null,
  };
};

