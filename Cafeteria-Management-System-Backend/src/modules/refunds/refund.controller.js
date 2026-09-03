const refundService = require('./refund.service');
const { Refund, REFUND_STATUSES, REFUND_METHODS, REFUND_REASONS } = require('./refund.model');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { BadRequestError } = require('../../utils/errors');

class RefundController {
  requestRefund = asyncHandler(async (req, res) => {
    const { paymentId, orderId, amount, reason, reasonDetails, refundMethod, notes, skipApproval } = req.body;
    const refund = await refundService.requestRefund({
      paymentId,
      orderId,
      amount,
      reason,
      reasonDetails,
      refundMethod,
      requestedBy: req.user,
      source: req.body.source || 'NORMAL',
      notes,
      skipApproval,
    });
    const msg = refund.status === 'APPROVED' ? 'Refund auto-approved and processed' : 'Refund request submitted for approval';
    return ApiResponse.success(res, 201, msg, refund);
  });

  approveRefund = asyncHandler(async (req, res) => {
    const refund = await refundService.approveRefund(req.params.refundId, req.user.id);
    return ApiResponse.success(res, 200, 'Refund approved', refund);
  });

  rejectRefund = asyncHandler(async (req, res) => {
    const { reason: rejectionReason } = req.body;
    const refund = await refundService.rejectRefund(req.params.refundId, req.user.id, rejectionReason);
    return ApiResponse.success(res, 200, 'Refund rejected', refund);
  });

  processRefund = asyncHandler(async (req, res) => {
    const refund = await refundService.processRefund(req.params.refundId, req.user.id);
    return ApiResponse.success(res, 200, 'Refund processed successfully', refund);
  });

  getRefund = asyncHandler(async (req, res) => {
    const refund = await refundService.getRefundById(req.params.refundId);
    return ApiResponse.success(res, 200, 'Refund details retrieved', refund);
  });

  listRefunds = asyncHandler(async (req, res) => {
    const { organizationId, branchId, status, page, limit } = req.query;
    const result = await refundService.listRefunds({ organizationId, branchId, status, page, limit });
    return ApiResponse.success(res, 200, 'Refunds retrieved', result);
  });

  getRefundStats = asyncHandler(async (req, res) => {
    const { organizationId } = req.query;
    const { branchId } = req.params;
    const { days } = req.query;
    const stats = await refundService.getRefundStats({ organizationId, branchId, days: parseInt(days) || 30 });
    return ApiResponse.success(res, 200, 'Refund statistics retrieved', stats);
  });

  getRefundablePayments = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const result = await refundService.getRefundablePayments(orderId);
    return ApiResponse.success(res, 200, 'Refundable payments retrieved', result);
  });
}

module.exports = new RefundController();
