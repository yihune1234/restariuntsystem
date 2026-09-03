const mongoose = require('mongoose');
const { Payment } = require('../payment.model');
const { Order } = require('../../orders/order.model');
const { transitionOrderStatus } = require('../../orders/order-state-machine');
const stockService = require('../../inventory/stock.service');
const { AuditLog } = require('../../audit/audit.model');
const socketEmitter = require('../../../sockets/socket.emitter');
const { BadRequestError, NotFoundError } = require('../../../utils/errors');
const { runInTransaction } = require('../../../utils/transaction');
const logger = require('../../../config/logger');

class CashierPaymentProvider {
  /**
   * Confirm Cashier Payment using a MongoDB Session Transaction when the
   * deployment supports it (replica set); otherwise falls back to sequential
   * execution on a standalone mongod. Atomically confirms order, records
   * payment, deducts stock, and creates audit log.
   */
  async confirmCashierPayment({
    orderId,
    staffUser,
    paymentMethod = 'CASH',
    ipAddress = '',
    userAgent = '',
  }) {
    let updatedOrder = null;
    let paymentRecord = null;
    let soldOutItems = [];

    await runInTransaction(async (session) => {
      // 1. Fetch order with row lock in session
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Branch isolation check
      if (
        staffUser.role !== 'OWNER' &&
        order.branchId.toString() !== staffUser.branchId.toString()
      ) {
        throw new BadRequestError('Cannot confirm payment for an order in another branch', 'BRANCH_MISMATCH');
      }

      // Prevent double payment
      if (order.paymentStatus === 'PAID') {
        throw new BadRequestError('Order has already been paid and confirmed', 'ORDER_ALREADY_PAID');
      }

      if (order.orderStatus === 'CANCELLED') {
        throw new BadRequestError('Cannot accept payment for a cancelled order', 'ORDER_CANCELLED');
      }

      // 2. Generate unique transaction reference
      const timestamp = Date.now();
      const providerTypeMap = {
        CASH: 'CASHIER_CASH',
        CARD: 'CASHIER_CARD',
        CHAPA: 'CASHIER_CARD', // Chapa processed by cashier
        TELEBIRR: 'CASHIER_CARD', // Telebirr processed by cashier
        BANK_TRANSFER: 'CASHIER_BANK_TRANSFER',
      };
      const providerType = providerTypeMap[paymentMethod] || 'CASHIER_CASH';
      const transactionReference = `TXN_CSH_${order._id}_${timestamp}`;

      // 3. Create PAID Payment document
      paymentRecord = new Payment({
        orderId: order._id,
        branchId: order.branchId,
        organizationId: order.organizationId,
        amount: order.total,
        currency: 'ETB',
        provider: providerType,
        status: 'PAID',
        transactionReference,
        providerReference: `CSH-RECEIPT-${timestamp}`,
        processedBy: staffUser.id,
        paidAt: new Date(),
      });
      await paymentRecord.save({ session });

      // 4. Update Order payment status and transition to CONFIRMED
      order.paymentStatus = 'PAID';
      order.paymentMethod = paymentMethod;

      updatedOrder = await transitionOrderStatus({
        order,
        nextStatus: 'CONFIRMED',
        changedBy: staffUser.id,
        changedByRole: staffUser.role,
        reason: `Payment received via Cashier (${paymentMethod})`,
        metadata: { transactionReference },
        session,
      });

      // 5. ATOMIC STOCK DEDUCTION (Concurrently safe)
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

      // 6. Audit Log creation
      const audit = new AuditLog({
        organizationId: order.organizationId,
        branchId: order.branchId,
        userId: staffUser.id,
        action: 'CONFIRM_PAYMENT',
        entityType: 'Order',
        entityId: order._id,
        oldValue: { paymentStatus: 'UNPAID', orderStatus: 'WAITING_FOR_PAYMENT' },
        newValue: { paymentStatus: 'PAID', orderStatus: 'CONFIRMED', total: order.total },
        ipAddress,
        userAgent,
      });
      await audit.save({ session });
    });

    // 7. REAL-TIME EVENTS EMITTED ONLY AFTER SUCCESSFUL DATABASE COMMIT
    if (updatedOrder) {
      socketEmitter.emitOrderConfirmed(updatedOrder);

      // Emit sold-out events if any food hit 0
      soldOutItems.forEach((item) => {
        socketEmitter.emitFoodSoldOut(updatedOrder.branchId, item.foodItemId, item.foodName);
      });
    }

    return {
      order: updatedOrder,
      payment: paymentRecord,
    };
  }
}

module.exports = new CashierPaymentProvider();
