const mongoose = require('mongoose');
const { Payment } = require('../payment.model');
const { Order } = require('../../orders/order.model');
const { transitionOrderStatus } = require('../../orders/order-state-machine');
const stockService = require('../../inventory/stock.service');
const { AuditLog } = require('../../audit/audit.model');
const socketEmitter = require('../../../sockets/socket.emitter');
const { chapaClient, config: chapaConfig } = require('../../../config/chapa');
const { BadRequestError, NotFoundError } = require('../../../utils/errors');
const { runInTransaction } = require('../../../utils/transaction');
const logger = require('../../../config/logger');

class ChapaPaymentProvider {
  /**
   * Initialize Chapa online checkout session
   */
  async initializePayment({ orderId, customerEmail = 'customer@restaurant.local', customerName = 'Guest Customer' }) {
    const order = await Order.findById(orderId).populate('branchId', 'name settings');

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestError('Order has already been paid and confirmed', 'ORDER_ALREADY_PAID');
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new BadRequestError('Cannot pay for a cancelled order', 'ORDER_CANCELLED');
    }

    const timestamp = Date.now();
    const transactionReference = `TXN_CHP_${order._id}_${timestamp}`;

    // 1. Create PENDING payment record
    const payment = await Payment.create({
      orderId: order._id,
      branchId: order.branchId._id,
      organizationId: order.organizationId,
      amount: order.total,
      currency: 'ETB',
      provider: 'CHAPA',
      status: 'PENDING',
      transactionReference,
    });

    order.paymentMethod = 'CHAPA';
    order.paymentStatus = 'PENDING';
    await order.save();

    // 2. Call Chapa API if configured, or provide development fallback URL
    let checkoutUrl = '';

    if (chapaConfig.secretKey && !chapaConfig.secretKey.includes('dummy')) {
      try {
        const chapaPayload = {
          amount: order.total.toString(),
          currency: 'ETB',
          email: customerEmail,
          first_name: customerName,
          last_name: 'Customer',
          tx_ref: transactionReference,
          callback_url: chapaConfig.callbackUrl,
          return_url: `${chapaConfig.returnUrl}${order.branchId._id}/${order._id}`,
          customization: {
            title: `${order.branchId.name} Order Payment`,
            description: `Order ${order.orderNumber}`,
          },
        };

        const response = await chapaClient.post('/transaction/initialize', chapaPayload);

        if (response.data && response.data.status === 'success') {
          checkoutUrl = response.data.data.checkout_url;
        } else {
          throw new Error(response.data?.message || 'Chapa initialization failed');
        }
      } catch (err) {
        logger.error(`Chapa API Initialization Error: ${err.message}`);
        throw new BadRequestError(`Failed to initialize Chapa payment: ${err.message}`, 'CHAPA_API_ERROR');
      }
    } else {
      // Dev mode sandbox checkout URL simulation
      checkoutUrl = `https://checkout.chapa.co/checkout/payment-mock/${transactionReference}`;
    }

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: 'ETB',
      transactionReference,
      checkoutUrl,
    };
  }

  /**
   * Complete Chapa payment verification with robust idempotency
   */
  async verifyAndProcessPayment({ transactionReference, ipAddress = '', userAgent = '' }) {
    if (!transactionReference) {
      throw new BadRequestError('Transaction reference is required for verification', 'MISSING_TX_REF');
    }

    // 1. Check existing payment record
    const payment = await Payment.findOne({ transactionReference });
    if (!payment) {
      throw new NotFoundError(`Payment with transaction reference '${transactionReference}' not found`, 'PAYMENT_NOT_FOUND');
    }

    // IDEMPOTENCY GUARD: If already marked PAID, return existing state without duplicate stock/status changes
    if (payment.status === 'PAID') {
      logger.info(`Idempotent webhook/verification ignored for already completed payment: ${transactionReference}`);
      const order = await Order.findById(payment.orderId);
      return { payment, order, alreadyProcessed: true };
    }

    // 2. Server-side verification with Chapa API
    let chapaReference = `CHAPA_VERIFIED_${Date.now()}`;

    if (chapaConfig.secretKey && !chapaConfig.secretKey.includes('dummy')) {
      try {
        const verifyRes = await chapaClient.get(`/transaction/verify/${transactionReference}`);
        if (!verifyRes.data || verifyRes.data.status !== 'success') {
          throw new BadRequestError('Chapa verification failed: Payment not confirmed', 'CHAPA_VERIFY_FAILED');
        }

        const data = verifyRes.data.data;
        const verifiedAmount = parseFloat(data.amount);

        if (verifiedAmount !== payment.amount) {
          throw new BadRequestError(
            `Payment amount mismatch! Expected ${payment.amount}, received ${verifiedAmount}`,
            'AMOUNT_MISMATCH'
          );
        }

        chapaReference = data.reference || data.tx_ref;
      } catch (err) {
        logger.error(`Chapa Verification Error: ${err.message}`);
        throw new BadRequestError(`Chapa verification failed: ${err.message}`, 'CHAPA_VERIFICATION_FAILED');
      }
    }

    // 3. ATOMIC ACID TRANSACTION: Confirm Order + Mark Payment PAID + Deduct
    // Stock + Audit Log. Falls back to sequential execution when the connected
    // MongoDB is a standalone instance (no replica set).
    let updatedOrder = null;
    let soldOutItems = [];

    await runInTransaction(async (session) => {
      const order = await Order.findById(payment.orderId).session(session);
      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.paymentStatus === 'PAID') {
        return; // Concurrently updated by another webhook call
      }

      // Update payment record
      payment.status = 'PAID';
      payment.providerReference = chapaReference;
      payment.paidAt = new Date();
      await payment.save({ session });

      // Update order status
      order.paymentStatus = 'PAID';
      order.paymentMethod = 'CHAPA';

      updatedOrder = await transitionOrderStatus({
        order,
        nextStatus: 'CONFIRMED',
        changedByRole: 'SYSTEM',
        reason: 'Chapa online payment verified successfully',
        metadata: { transactionReference, chapaReference },
        session,
      });

      // Concurrency-safe stock deduction
      const stockResult = await stockService.deductStockAtomic({
        items: order.items.map((it) => ({
          foodItemId: it.foodItemId,
          quantity: it.quantity,
          foodName: it.foodNameSnapshot,
        })),
        branchId: order.branchId,
        session,
      });
      soldOutItems = stockResult.soldOutItems || [];

      // Audit log
      const audit = new AuditLog({
        organizationId: order.organizationId,
        branchId: order.branchId,
        action: 'CONFIRM_PAYMENT',
        entityType: 'Order',
        entityId: order._id,
        oldValue: { paymentStatus: 'PENDING', orderStatus: 'WAITING_FOR_PAYMENT' },
        newValue: { paymentStatus: 'PAID', orderStatus: 'CONFIRMED', total: order.total },
        ipAddress,
        userAgent,
      });
      await audit.save({ session });
    });

    // 4. EMIT REAL-TIME EVENTS POST DATABASE COMMIT
    if (updatedOrder) {
      socketEmitter.emitOrderConfirmed(updatedOrder);

      soldOutItems.forEach((item) => {
        socketEmitter.emitFoodSoldOut(updatedOrder.branchId, item.foodItemId, item.foodName);
      });
    }

    return {
      payment,
      order: updatedOrder,
      alreadyProcessed: false,
    };
  }
}

module.exports = new ChapaPaymentProvider();
