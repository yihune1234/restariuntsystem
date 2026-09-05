const mongoose = require('mongoose');
const { Payment } = require('../payment.model');
const { Order } = require('../../orders/order.model');
const { transitionOrderStatus } = require('../../orders/order-state-machine');
const socketEmitter = require('../../../sockets/socket.emitter');
const { BadRequestError, NotFoundError } = require('../../../utils/errors');

class CashierPaymentProvider {
  async confirmCashierPayment({
    orderId,
    staffUser,
    paymentMethod = 'CASH',
  }) {
    const session = await mongoose.startSession();
    let updatedOrder = null;
    let paymentRecord = null;

    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);

        if (!order) {
          throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
        }

        if (order.paymentStatus === 'PAID') {
          throw new BadRequestError('Order has already been paid and confirmed', 'ORDER_ALREADY_PAID');
        }

        if (order.orderStatus === 'CANCELLED') {
          throw new BadRequestError('Cannot accept payment for a cancelled order', 'ORDER_CANCELLED');
        }

        const timestamp = Date.now();
        const providerTypeMap = {
          CASH: 'CASH',
          CARD: 'CARD',
          CHAPA: 'CHAPA',
          TELEBIRR: 'TELEBIRR',
          BANK_TRANSFER: 'BANK_TRANSFER',
        };
        const providerType = providerTypeMap[paymentMethod] || 'CASH';
        const transactionReference = `TXN_${order._id}_${timestamp}`;

        paymentRecord = new Payment({
          orderId: order._id,
          amount: order.total,
          currency: 'ETB',
          provider: providerType,
          status: 'PAID',
          transactionReference,
          providerReference: `RECEIPT-${timestamp}`,
          processedBy: staffUser.id,
          paidAt: new Date(),
        });
        await paymentRecord.save({ session });

        order.paymentStatus = 'PAID';
        order.paymentMethod = paymentMethod;

        updatedOrder = await transitionOrderStatus({
          order,
          nextStatus: 'PREPARING',
          changedBy: staffUser.id,
          changedByRole: staffUser.role,
          reason: `Payment received via ${paymentMethod}`,
          metadata: { transactionReference },
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    if (updatedOrder) {
      socketEmitter.emitOrderConfirmed(updatedOrder);
      socketEmitter.emitOrderPreparing(updatedOrder);
    }

    return {
      order: updatedOrder,
      payment: paymentRecord,
    };
  }
}

module.exports = new CashierPaymentProvider();
