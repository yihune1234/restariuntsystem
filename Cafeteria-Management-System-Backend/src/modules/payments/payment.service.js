const { Payment } = require('./payment.model');
const cashierProvider = require('./providers/cashier.provider');
const chapaProvider = require('./providers/chapa.provider');
const { NotFoundError } = require('../../utils/errors');

class PaymentService {
  async initiateChapaPayment({ orderId, customerEmail, customerName }) {
    return chapaProvider.initializePayment({ orderId, customerEmail, customerName });
  }

  async verifyChapaPayment({ transactionReference, ipAddress, userAgent }) {
    return chapaProvider.verifyAndProcessPayment({ transactionReference, ipAddress, userAgent });
  }

  async confirmCashierPayment({ orderId, staffUser, paymentMethod, ipAddress, userAgent }) {
    return cashierProvider.confirmCashierPayment({
      orderId,
      staffUser,
      paymentMethod,
      ipAddress,
      userAgent,
    });
  }

  async getOrderPayment(orderId) {
    const payment = await Payment.findOne({ orderId })
      .populate('processedBy', 'name role')
      .populate('branchId', 'name');

    if (!payment) {
      throw new NotFoundError('Payment record not found for this order', 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }
}

module.exports = new PaymentService();
