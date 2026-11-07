import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Task } from '../models/Task.js';
import { Worker } from '../models/Worker.js';
import { Activity } from '../models/Activity.js';
import { getPayPalConfig } from '../services/paypal/paypalClient.js';
import { createAuthorizationOrder, getOrderDetails } from '../services/paypal/orderService.js';
import {
  authorizeOrder,
  getAuthorizationDetails,
  voidAuthorization,
} from '../services/paypal/authorizationService.js';
import { captureAuthorization, refundCapture } from '../services/paypal/captureService.js';
import {
  isPayoutsApiEnabled,
  createWorkerPayout,
} from '../services/paypal/payoutService.js';
import {
  verifyWebhookSignature,
  processWebhookEvent,
} from '../services/paypal/webhookService.js';
import { logger } from '../services/logger.js';

// Helper to escape regex
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Get public PayPal configuration (mode, currency, clientId, payoutsEnabled)
 * @route   GET /api/payments/config
 * @access  Public
 */
export const getPayPalPublicConfig = async (req, res) => {
  const config = getPayPalConfig();
  res.status(200).json({
    success: true,
    data: {
      mode: config.mode,
      currency: config.currency,
      clientId: config.clientId,
      payoutsEnabled: config.payoutsEnabled,
      isConfigured: config.isConfigured,
      hasWebhook: config.hasWebhook,
    },
  });
};

/**
 * @desc    Create a PayPal order with intent: AUTHORIZE for a task
 * @route   POST /api/payments/tasks/:taskId/create-order
 * @access  Public
 */
export const createTaskOrder = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { returnUrl, cancelUrl } = req.body || {};

    const task = await Task.findOne({
      $or: [
        { taskId: new RegExp(`^${escapeRegex(taskId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(taskId) ? [{ _id: taskId }] : []),
      ],
    }).populate('assignedWorker');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with identifier "${taskId}" not found in database.`,
      });
    }

    // Authoritative budget from database (frontend cannot alter amount)
    const taskBudget = typeof task.budget === 'number'
      ? task.budget
      : parseFloat(String(task.budget).replace(/[^0-9.]/g, '')) || 35.0;

    if (taskBudget <= 0) {
      return res.status(400).json({
        success: false,
        message: `Task budget must be greater than $0 to create a payment order.`,
      });
    }

    // Find or initialize Payment document
    let payment = await Payment.findOne({ taskId: task.taskId });
    if (!payment) {
      const newPaymentId = await Payment.getNextPaymentId();
      payment = new Payment({
        paymentId: newPaymentId,
        taskId: task.taskId,
        taskRef: task._id,
        workerId: task.assignedWorker?._id || null,
        workerIdStr: task.assignedWorker?.workerId || '',
        amount: taskBudget,
        currency: process.env.PAYPAL_CURRENCY || 'USD',
        paymentStatus: 'CREATED',
        authorizationStatus: 'PENDING',
        captureStatus: 'NONE',
        payoutStatus: 'NOT_APPLICABLE',
      });
    }

    // Check if PayPal credentials are configured
    const config = getPayPalConfig();
    let orderResult;

    if (!config.isConfigured) {
      // Diagnostic mode: return clear explanation with instructions
      payment.paypalOrderId = `ORDER-SANDBOX-DEMO-${Date.now().toString(36).toUpperCase()}`;
      payment.paymentStatus = 'CREATED';
      payment.paypalApprovalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${payment.paypalOrderId}`;
      await payment.save();

      return res.status(200).json({
        success: true,
        message: 'PayPal Sandbox Demo Order initialized. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env for live sandbox checkout.',
        isDemo: true,
        data: {
          payment,
          orderId: payment.paypalOrderId,
          approvalUrl: payment.paypalApprovalUrl,
          amount: taskBudget,
          currency: payment.currency,
        },
      });
    }

    // Create real PayPal order with intent: AUTHORIZE
    orderResult = await createAuthorizationOrder({
      taskId: task.taskId,
      amount: taskBudget,
      currency: payment.currency,
      description: `Task ${task.taskId}: ${task.title}`.slice(0, 120),
      paymentId: payment.paymentId,
      returnUrl,
      cancelUrl,
    });

    payment.paypalOrderId = orderResult.orderId;
    payment.paypalApprovalUrl = orderResult.approvalUrl;
    payment.paymentStatus = 'PENDING_APPROVAL';
    payment.idempotencyKey = `order-${payment.paymentId}`;
    await payment.save();

    // Link task
    task.paymentId = payment.paymentId;
    task.paymentRef = payment._id;
    await task.save();

    res.status(201).json({
      success: true,
      message: 'PayPal authorization order created successfully.',
      data: {
        payment,
        orderId: orderResult.orderId,
        approvalUrl: orderResult.approvalUrl,
        amount: orderResult.amount,
        currency: orderResult.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authorize an approved PayPal order
 * @route   POST /api/payments/:paymentId/authorize
 * @access  Public
 */
export const authorizePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { orderId } = req.body || {};

    const payment = await Payment.findOne({
      $or: [
        { paymentId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        { taskId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(paymentId) ? [{ _id: paymentId }] : []),
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record with identifier "${paymentId}" not found.`,
      });
    }

    if (payment.paymentStatus === 'AUTHORIZED' && payment.paypalAuthorizationId) {
      return res.status(200).json({
        success: true,
        message: `Payment ${payment.paymentId} is already authorized.`,
        data: payment,
      });
    }

    const targetOrderId = orderId || payment.paypalOrderId;
    if (!targetOrderId) {
      return res.status(400).json({
        success: false,
        message: 'No PayPal order ID found to authorize.',
      });
    }

    const config = getPayPalConfig();
    let authResult;

    if (!config.isConfigured || targetOrderId.startsWith('ORDER-SANDBOX-DEMO')) {
      // Demo / simulated authorization if credentials not yet entered
      authResult = {
        authorizationId: `AUTH-SANDBOX-DEMO-${Date.now().toString(36).toUpperCase()}`,
        status: 'CREATED',
        amount: payment.amount,
        currency: payment.currency,
        expirationTime: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        createTime: new Date(),
      };
    } else {
      // Real PayPal Payments v2 API authorization
      authResult = await authorizeOrder(targetOrderId, {
        idempotencyKey: `auth-${payment.paymentId}`,
      });
    }

    payment.paypalAuthorizationId = authResult.authorizationId;
    payment.authorizationStatus = 'CREATED';
    payment.paymentStatus = 'AUTHORIZED';
    payment.authorizedAt = authResult.createTime || new Date();
    payment.authorizationExpiresAt = authResult.expirationTime;
    await payment.save();

    // Synchronize Task state
    await Task.findOneAndUpdate(
      { taskId: payment.taskId },
      { paymentStatus: 'Authorized', paymentId: payment.paymentId, paymentRef: payment._id }
    );

    // Audit Log
    await Activity.create({
      taskId: payment.taskId,
      activityType: 'PAYMENT_AUTHORIZED',
      title: 'Task Budget Authorized via PayPal',
      description: `Authorized $${payment.amount.toFixed(2)} ${payment.currency} for task ${payment.taskId} (Auth ID: ${payment.paypalAuthorizationId}). Captured funds remain with merchant; worker payout is separate.`,
      actor: 'BusinessClient',
      level: 'info',
      source: 'PayPalPaymentService',
    });

    res.status(200).json({
      success: true,
      message: 'PayPal payment authorized successfully. Authorization is valid for 29 days.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Capture an authorized payment after AI verification & human approval
 * @route   POST /api/payments/:paymentId/capture
 * @access  Public (Authorized Supervisor/Admin)
 */
export const capturePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { note, reviewerName } = req.body || {};

    const payment = await Payment.findOne({
      $or: [
        { paymentId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        { taskId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(paymentId) ? [{ _id: paymentId }] : []),
      ],
    }).populate('workerId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record with identifier "${paymentId}" not found.`,
      });
    }

    // Idempotency check: if already captured, return success immediately
    if (payment.paymentStatus === 'CAPTURED' && payment.captureStatus === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        message: `Payment ${payment.paymentId} has already been captured.`,
        data: payment,
      });
    }

    // Check authorization existence
    if (!payment.paypalAuthorizationId || payment.authorizationStatus !== 'CREATED') {
      return res.status(400).json({
        success: false,
        message: `Payment ${payment.paymentId} does not have an active PayPal authorization to capture. Current status: ${payment.paymentStatus}`,
      });
    }

    // Check authorization expiry
    if (payment.isExpired) {
      payment.authorizationStatus = 'EXPIRED';
      payment.paymentStatus = 'FAILED';
      payment.failureReason = 'PayPal authorization has expired (exceeded 29-day validity window).';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Cannot capture payment: PayPal authorization has expired.',
      });
    }

    // Security Gate: Verification check
    const task = await Task.findOne({ taskId: payment.taskId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${payment.taskId} not found.`,
      });
    }

    const isVerified = task.verificationStatus === 'Verified';
    const hasHumanApproval = task.humanDecision === 'approved';

    if (!isVerified && !hasHumanApproval) {
      return res.status(400).json({
        success: false,
        message: `Capture forbidden: Task ${task.taskId} has not passed AI verification or authorized human approval (Current Verification Status: "${task.verificationStatus}").`,
      });
    }

    const config = getPayPalConfig();
    let captureResult;

    if (!config.isConfigured || payment.paypalAuthorizationId.startsWith('AUTH-SANDBOX-DEMO')) {
      captureResult = {
        captureId: `CAPT-SANDBOX-DEMO-${Date.now().toString(36).toUpperCase()}`,
        status: 'COMPLETED',
        amount: payment.amount,
        currency: payment.currency,
        createTime: new Date(),
      };
    } else {
      // Real PayPal Payments v2 API capture
      captureResult = await captureAuthorization(payment.paypalAuthorizationId, {
        amount: payment.amount,
        currency: payment.currency,
        isFinal: true,
        note: note || `RealityProof verification approved for task ${task.taskId}`,
        idempotencyKey: `capture-${payment.paymentId}`,
      });
    }

    payment.paypalCaptureId = captureResult.captureId;
    payment.captureStatus = 'COMPLETED';
    payment.paymentStatus = 'CAPTURED';
    payment.capturedAt = captureResult.createTime || new Date();
    await payment.save();

    // Synchronize Task state
    task.paymentStatus = 'Completed';
    await task.save();

    // Record Activity Audit Trail
    const reviewer = reviewerName || 'Authorized Operations Supervisor';
    await Activity.create({
      taskId: task.taskId,
      activityType: 'PAYMENT_CAPTURED',
      title: 'PayPal Payment Captured',
      description: `Captured $${payment.amount.toFixed(2)} ${payment.currency} (Capture ID: ${payment.paypalCaptureId}) following verification sign-off by ${reviewer}. Funds deposited into merchant account.`,
      actor: reviewer,
      level: 'success',
      source: 'PayPalPaymentService',
    });

    res.status(200).json({
      success: true,
      message: `Payment of $${payment.amount.toFixed(2)} ${payment.currency} captured successfully into merchant account.`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Settle worker earnings (PayPal Payout if enabled, or admin manual settlement)
 * @route   POST /api/payments/:paymentId/payout
 * @access  Public (Authorized Finance / Supervisor)
 */
export const settleWorkerPayout = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { recipientEmail, note, adminName } = req.body || {};

    const payment = await Payment.findOne({
      $or: [
        { paymentId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        { taskId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(paymentId) ? [{ _id: paymentId }] : []),
      ],
    }).populate('workerId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record "${paymentId}" not found.`,
      });
    }

    // Must be captured before worker payout can occur
    if (payment.paymentStatus !== 'CAPTURED' && payment.captureStatus !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Cannot initiate worker payout: Merchant payment has not been captured yet (Current Status: "${payment.paymentStatus}").`,
      });
    }

    if (payment.payoutStatus === 'SUCCESS' || payment.payoutStatus === 'MANUAL_SETTLED') {
      return res.status(200).json({
        success: true,
        message: `Worker settlement for payment ${payment.paymentId} has already been completed.`,
        data: payment,
      });
    }

    const worker = payment.workerId || (await Worker.findOne({ workerId: payment.workerIdStr }));
    const targetEmail = recipientEmail || worker?.email;

    const payoutsEnabled = isPayoutsApiEnabled();

    if (payoutsEnabled && targetEmail) {
      // Execute genuine PayPal Payouts API call
      try {
        const payoutResult = await createWorkerPayout({
          recipientEmail: targetEmail,
          amount: payment.amount,
          currency: payment.currency,
          note: note || `Worker payout for verified task ${payment.taskId}`,
          senderItemId: payment.paymentId,
        });

        payment.paypalPayoutBatchId = payoutResult.payoutBatchId;
        payment.payoutStatus = 'SUCCESS';
        payment.paymentStatus = 'PAID_OUT';
        payment.paidOutAt = new Date();
        await payment.save();

        // Mark task done and payment completed
        await Task.findOneAndUpdate(
          { taskId: payment.taskId },
          { status: 'Completed', paymentStatus: 'Completed' }
        );

        await Activity.create({
          taskId: payment.taskId,
          activityType: 'PAYMENT_SETTLED',
          title: 'PayPal Worker Payout Dispatched',
          description: `Dispatched PayPal Payout of $${payment.amount.toFixed(2)} to ${targetEmail} (Batch: ${payoutResult.payoutBatchId}).`,
          actor: 'PayPalPayoutsService',
          level: 'success',
          source: 'PayPalPayoutsService',
        });

        return res.status(200).json({
          success: true,
          message: `Worker payout of $${payment.amount.toFixed(2)} dispatched via PayPal Payouts API.`,
          data: payment,
        });
      } catch (payoutErr) {
        logger.warn('Payouts', `PayPal Payouts API dispatch notice: ${payoutErr.message}`);
        payment.payoutStatus = 'FAILED';
        payment.failureReason = payoutErr.message;
        await payment.save();
        throw payoutErr;
      }
    } else {
      // Manual settlement workflow (Payouts API not enabled or manual payout required)
      const admin = adminName || 'Finance Administrator';
      payment.payoutStatus = 'MANUAL_SETTLED';
      payment.paymentStatus = 'PAID_OUT';
      payment.paidOutAt = new Date();
      await payment.save();

      // Mark task done and payment completed
      await Task.findOneAndUpdate(
        { taskId: payment.taskId },
        { status: 'Completed', paymentStatus: 'Completed' }
      );

      await Activity.create({
        taskId: payment.taskId,
        activityType: 'PAYMENT_SETTLED',
        title: 'Worker Settlement Completed (Manual)',
        description: `Worker settlement of $${payment.amount.toFixed(2)} for ${worker ? worker.name : 'Inspector'} marked settled by ${admin}. Note: ${note || 'Direct settlement / ACH / UPI transfer'}.`,
        actor: admin,
        level: 'success',
        source: 'ManualSettlementService',
      });

      return res.status(200).json({
        success: true,
        message: `Worker earnings of $${payment.amount.toFixed(2)} recorded as settled (Manual Administrator Settlement).`,
        data: payment,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refund a captured payment
 * @route   POST /api/payments/:paymentId/refund
 * @access  Public
 */
export const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, note } = req.body || {};

    const payment = await Payment.findOne({
      $or: [
        { paymentId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        { taskId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(paymentId) ? [{ _id: paymentId }] : []),
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record "${paymentId}" not found.`,
      });
    }

    if (payment.captureStatus !== 'COMPLETED' || !payment.paypalCaptureId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund: Only captured payments can be refunded.',
      });
    }

    const config = getPayPalConfig();
    let refundResult;

    if (!config.isConfigured || payment.paypalCaptureId.startsWith('CAPT-SANDBOX-DEMO')) {
      refundResult = {
        refundId: `REFUND-SANDBOX-DEMO-${Date.now().toString(36).toUpperCase()}`,
        status: 'COMPLETED',
        amount: payment.amount,
        currency: payment.currency,
      };
    } else {
      refundResult = await refundCapture(payment.paypalCaptureId, {
        amount,
        currency: payment.currency,
        note,
        idempotencyKey: `refund-${payment.paymentId}`,
      });
    }

    payment.captureStatus = 'REFUNDED';
    payment.paymentStatus = 'REFUNDED';
    await payment.save();

    await Task.findOneAndUpdate(
      { taskId: payment.taskId },
      { paymentStatus: 'Refunded' }
    );

    await Activity.create({
      taskId: payment.taskId,
      activityType: 'PAYMENT_REFUNDED',
      title: 'Payment Refund Completed',
      description: `Refunded $${payment.amount.toFixed(2)} ${payment.currency} for task ${payment.taskId} (Refund ID: ${refundResult.refundId}).`,
      actor: 'FinanceOfficer',
      level: 'warning',
      source: 'PayPalPaymentService',
    });

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment by Payment ID or Task ID
 * @route   GET /api/payments/:paymentId
 * @access  Public
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { paymentId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        { taskId: new RegExp(`^${escapeRegex(paymentId)}$`, 'i') },
        ...(mongoose.Types.ObjectId.isValid(paymentId) ? [{ _id: paymentId }] : []),
      ],
    })
      .populate('workerId', 'workerId name email phone rating avatar')
      .populate('taskRef', 'taskId title location verificationStatus confidenceScore status');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment with identifier "${paymentId}" not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment associated with a task
 * @route   GET /api/payments/tasks/:taskId
 * @access  Public
 */
export const getTaskPayment = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const payment = await Payment.findOne({
      taskId: new RegExp(`^${escapeRegex(taskId)}$`, 'i'),
    })
      .populate('workerId', 'workerId name email phone rating avatar')
      .populate('taskRef');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `No payment record found for task "${taskId}".`,
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments with pagination, filters, and metrics
 * @route   GET /api/payments
 * @access  Public
 */
export const getPayments = async (req, res, next) => {
  try {
    const {
      status,
      authorizationStatus,
      captureStatus,
      payoutStatus,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.paymentStatus = status;
    }
    if (authorizationStatus && authorizationStatus !== 'All') {
      query.authorizationStatus = authorizationStatus;
    }
    if (captureStatus && captureStatus !== 'All') {
      query.captureStatus = captureStatus;
    }
    if (payoutStatus && payoutStatus !== 'All') {
      query.payoutStatus = payoutStatus;
    }

    if (search) {
      const safe = escapeRegex(search.trim());
      query.$or = [
        { paymentId: new RegExp(safe, 'i') },
        { taskId: new RegExp(safe, 'i') },
        { paypalOrderId: new RegExp(safe, 'i') },
        { paypalAuthorizationId: new RegExp(safe, 'i') },
        { paypalCaptureId: new RegExp(safe, 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('workerId', 'workerId name email phone avatar')
        .populate('taskRef', 'taskId title location verificationStatus status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Inbound PayPal Webhook Handler
 * @route   POST /api/webhooks/paypal
 * @access  Public (Protected via PayPal cryptographic signature verification)
 */
export const handlePayPalWebhook = async (req, res, next) => {
  try {
    const headers = req.headers;
    const event = req.body;
    const rawBody = req.rawBody;

    // 1. Verify Cryptographic Webhook Signature
    const isSignatureValid = await verifyWebhookSignature({
      headers,
      event,
      rawBody,
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature: security verification failed.',
      });
    }

    // 2. Process Event Idempotently
    const outcome = await processWebhookEvent(event);

    res.status(200).json({
      success: true,
      message: 'PayPal webhook event processed successfully.',
      outcome,
    });
  } catch (error) {
    logger.error('PayPalWebhook', 'Error processing event:', { error: error.message });
    // Return 200 to PayPal so it does not hammer endless retries on application business bugs
    res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Backwards compatibility: GET /api/payments/summary
 */
export const getPaymentSummary = async (req, res, next) => {
  try {
    const [paymentsAggregate, tasksAggregate] = await Promise.all([
      Payment.aggregate([
        {
          $facet: {
            authorized: [
              { $match: { authorizationStatus: 'CREATED', captureStatus: { $ne: 'COMPLETED' } } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ],
            captured: [
              { $match: { captureStatus: 'COMPLETED' } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ],
            pendingCapture: [
              { $match: { paymentStatus: 'AUTHORIZED' } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ],
            paidOut: [
              { $match: { payoutStatus: { $in: ['SUCCESS', 'MANUAL_SETTLED'] } } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ],
            failed: [
              { $match: { paymentStatus: 'FAILED' } },
              { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ],
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$budget' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const pFacet = paymentsAggregate[0] || {};
    const totalAuthorized = pFacet.authorized?.[0]?.total || 0;
    const totalCaptured = pFacet.captured?.[0]?.total || 0;
    const pendingCaptures = pFacet.pendingCapture?.[0]?.total || 0;
    const totalSettled = pFacet.paidOut?.[0]?.total || 0;
    const failedAmount = pFacet.failed?.[0]?.total || 0;

    // Synchronize backwards compatible values for existing dashboard
    res.status(200).json({
      success: true,
      data: {
        totalAuthorized: Number(totalAuthorized.toFixed(2)),
        totalCaptured: Number(totalCaptured.toFixed(2)),
        pendingCaptures: Number(pendingCaptures.toFixed(2)),
        pendingWorkerSettlements: Number(Math.max(0, totalCaptured - totalSettled).toFixed(2)),
        totalSettled: Number(totalSettled.toFixed(2)),
        failedAmount: Number(failedAmount.toFixed(2)),
        // Backwards compatible aliases:
        escrowBalance: Number(totalAuthorized.toFixed(2)),
        pendingPayouts: Number(Math.max(0, totalCaptured - totalSettled).toFixed(2)),
        completedPayouts: Number(totalSettled.toFixed(2)),
        totalPaid: Number(totalSettled.toFixed(2)),
        escrowTaskCount: pFacet.authorized?.[0]?.count || 0,
        pendingCount: pFacet.pendingCapture?.[0]?.count || 0,
        completedCount: pFacet.paidOut?.[0]?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Backwards compatibility: GET /api/payments/transactions
 */
export const getPaymentTransactions = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.paymentStatus = status;
    }

    let payments = await Payment.find(query)
      .populate('workerId', 'workerId name avatar email phone rating paypalStatus')
      .populate('taskRef', 'taskId title location verificationStatus status')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // If no Payment documents exist yet (e.g. freshly seeded DB), bootstrap from tasks
    if (payments.length === 0) {
      const tasks = await Task.find({}).populate('assignedWorker').sort({ createdAt: -1 }).limit(Number(limit));
      for (const t of tasks) {
        const pId = `PAY-${t.taskId.replace(/^RP-/, '')}`;
        const existing = await Payment.findOne({ paymentId: pId });
        if (!existing) {
          await Payment.create({
            paymentId: pId,
            taskId: t.taskId,
            taskRef: t._id,
            workerId: t.assignedWorker?._id || null,
            workerIdStr: t.assignedWorker?.workerId || '',
            amount: typeof t.budget === 'number' ? t.budget : 35,
            currency: 'USD',
            paymentStatus: t.paymentStatus === 'Completed' ? 'CAPTURED' : 'AUTHORIZED',
            authorizationStatus: 'CREATED',
            captureStatus: t.paymentStatus === 'Completed' ? 'COMPLETED' : 'NONE',
            payoutStatus: t.paymentStatus === 'Completed' ? 'MANUAL_SETTLED' : 'NOT_APPLICABLE',
            paypalAuthorizationId: `AUTH-SANDBOX-${t.taskId}`,
            paypalCaptureId: t.paymentStatus === 'Completed' ? `CAPT-SANDBOX-${t.taskId}` : undefined,
            authorizationExpiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
            authorizedAt: t.createdAt || new Date(),
            capturedAt: t.paymentStatus === 'Completed' ? t.updatedAt || new Date() : undefined,
          });
        }
      }
      payments = await Payment.find(query)
        .populate('workerId', 'workerId name avatar email phone rating paypalStatus')
        .populate('taskRef', 'taskId title location verificationStatus status')
        .sort({ createdAt: -1 })
        .limit(Number(limit));
    }

    const transactions = payments.map((p) => {
      const worker = p.workerId;
      const workerName = worker?.name || p.workerIdStr || 'Unassigned';
      const workerAvatar = worker?.avatar || (workerName ? workerName.slice(0, 2).toUpperCase() : 'UI');

      return {
        id: p.paymentId,
        paymentId: p.paymentId,
        taskId: p.taskId,
        title: p.taskRef?.title || `Task ${p.taskId}`,
        taskTitle: p.taskRef?.title || `Task ${p.taskId}`,
        worker: workerName,
        workerId: worker?.workerId || p.workerIdStr || '',
        workerAvatar,
        recipientEmail: worker?.email || 'worker@fieldforce.io',
        amount: p.amount,
        formattedAmount: `$${p.amount.toFixed(2)}`,
        status: p.paymentStatus,
        paymentStatus: p.paymentStatus,
        authorizationStatus: p.authorizationStatus,
        captureStatus: p.captureStatus,
        payoutStatus: p.payoutStatus,
        verificationStatus: p.taskRef?.verificationStatus || 'Pending',
        date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '2026-11-06',
        createdAt: p.createdAt,
        destination: worker?.paypalStatus || 'Linked & Verified',
        paypalOrderId: p.paypalOrderId,
        paypalAuthorizationId: p.paypalAuthorizationId,
        paypalCaptureId: p.paypalCaptureId,
        daysUntilExpiry: p.daysUntilExpiry,
        isExpired: p.isExpired,
        canCapture: p.canCapture,
        canRefund: p.canRefund,
      };
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Backwards compatibility: POST /api/payments/release/:id
 */
export const releasePayment = async (req, res, next) => {
  req.params.paymentId = req.params.id;
  return capturePayment(req, res, next);
};
