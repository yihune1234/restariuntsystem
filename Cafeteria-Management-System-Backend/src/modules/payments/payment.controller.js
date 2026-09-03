const paymentService = require('./payment.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../config/logger');

class PaymentController {
  initiateChapa = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { email, firstName } = req.body;

    const result = await paymentService.initiateChapaPayment({
      orderId,
      customerEmail: email,
      customerName: firstName,
    });

    return ApiResponse.success(res, 200, 'Chapa payment session initiated', result);
  });

  handleChapaWebhook = asyncHandler(async (req, res) => {
    const txRef = req.body.tx_ref || req.body.trx_ref || req.query.tx_ref;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    logger.info(`Received Chapa webhook for tx_ref: ${txRef}`);

    if (txRef) {
      await paymentService.verifyChapaPayment({
        transactionReference: txRef,
        ipAddress,
        userAgent,
      });
    }

    return res.status(200).json({ status: 'success' });
  });

  verifyChapa = asyncHandler(async (req, res) => {
    const { transactionReference } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const result = await paymentService.verifyChapaPayment({
      transactionReference,
      ipAddress,
      userAgent,
    });

    return ApiResponse.success(res, 200, 'Chapa payment verified successfully', result);
  });

  confirmCashierPayment = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const result = await paymentService.confirmCashierPayment({
      orderId,
      staffUser: req.user,
      paymentMethod,
      ipAddress,
      userAgent,
    });

    return ApiResponse.success(res, 200, 'Payment confirmed successfully by Cashier', result);
  });

  getOrderPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.getOrderPayment(req.params.orderId);
    return ApiResponse.success(res, 200, 'Payment details retrieved', payment);
  });
}

module.exports = new PaymentController();
