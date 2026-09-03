const mongoose = require('mongoose');
const { Refund, REFUND_STATUSES, REFUND_METHODS, REFUND_REASONS } = require('./refund.model');
const { Payment } = require('../payments/payment.model');
const { Order } = require('../orders/order.model');
const auditService = require('../audit/audit.service');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

class RefundService {
  generateReferenceNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF-${timestamp}-${random}`;
  }

  async getTotalRefundedForPayment(paymentId) {
    const result = await Refund.aggregate([
      {
        $match: {
          paymentId: new mongoose.Types.ObjectId(paymentId),
          status: { $in: ['APPROVED', 'PROCESSED', 'PENDING'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total || 0;
  }

  async requestRefund({
    paymentId,
    orderId,
    amount,
    reason,
    reasonDetails = '',
    refundMethod = 'ORIGINAL_PAYMENT_METHOD',
    requestedBy,
    source = 'NORMAL',
    notes = '',
    skipApproval = false,
  }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new NotFoundError('Original payment not found', 'PAYMENT_NOT_FOUND');

    const order = await Order.findById(orderId);
    if (!order) throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');

    if (payment.orderId.toString() !== orderId.toString()) {
      throw new BadRequestError('Payment does not belong to this order', 'PAYMENT_ORDER_MISMATCH');
    }

    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED') {
      throw new BadRequestError(
        `Cannot refund an order with payment status '${order.paymentStatus}'`,
        'ORDER_NOT_PAID'
      );
    }

    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new BadRequestError('Refund amount must be greater than zero', 'INVALID_REFUND_AMOUNT');
    }

    const alreadyRefunded = await this.getTotalRefundedForPayment(paymentId);
    const maxRefundable = payment.amount - alreadyRefunded;
    if (refundAmount > maxRefundable) {
      throw new BadRequestError(
        `Refund amount (${refundAmount}) exceeds the remaining refundable amount (${maxRefundable.toFixed(2)})`,
        'REFUND_EXCEEDS_PAYMENT'
      );
    }

    if (reason === 'OTHER' && !reasonDetails.trim()) {
      throw new BadRequestError('Detailed reason is required when reason is OTHER', 'REASON_DETAILS_REQUIRED');
    }

    const referenceNumber = this.generateReferenceNumber();
    const refund = await Refund.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      paymentId,
      orderId,
      amount: refundAmount,
      currency: payment.currency || 'ETB',
      status: skipApproval ? 'APPROVED' : 'PENDING',
      reason,
      reasonDetails,
      refundMethod,
      requestedBy: requestedBy.id,
      source,
      referenceNumber,
      notes,
    });

    await auditService.logAction({
      organizationId: order.organizationId,
      branchId: order.branchId,
      userId: requestedBy.id,
      action: 'REFUND_REQUESTED',
      entityType: 'Refund',
      entityId: refund._id,
      newValue: { amount: refundAmount, reason, refundMethod, paymentId, orderId, referenceNumber },
    });

    if (skipApproval) return this.processRefund(refund._id, requestedBy.id);
    return refund;
  }

  async approveRefund(refundId, approvedBy) {
    const refund = await Refund.findById(refundId);
    if (!refund) throw new NotFoundError('Refund request not found', 'REFUND_NOT_FOUND');
    if (refund.status !== 'PENDING') {
      throw new BadRequestError(`Cannot approve a refund with status '${refund.status}'`, 'INVALID_REFUND_STATUS');
    }
    refund.status = 'APPROVED';
    refund.approvedBy = approvedBy;
    refund.approvedAt = new Date();
    await refund.save();

    await auditService.logAction({
      organizationId: refund.organizationId,
      branchId: refund.branchId,
      userId: approvedBy,
      action: 'REFUND_APPROVED',
      entityType: 'Refund',
      entityId: refund._id,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'APPROVED', approvedBy },
    });
    return refund;
  }

  async rejectRefund(refundId, rejectedBy, rejectionReason) {
    const refund = await Refund.findById(refundId);
    if (!refund) throw new NotFoundError('Refund request not found', 'REFUND_NOT_FOUND');
    if (refund.status !== 'PENDING') {
      throw new BadRequestError(`Cannot reject a refund with status '${refund.status}'`, 'INVALID_REFUND_STATUS');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new BadRequestError('Rejection reason is required', 'REJECTION_REASON_REQUIRED');
    }
    refund.status = 'REJECTED';
    refund.rejectedBy = rejectedBy;
    refund.rejectedAt = new Date();
    refund.rejectionReason = rejectionReason;
    await refund.save();

    await auditService.logAction({
      organizationId: refund.organizationId,
      branchId: refund.branchId,
      userId: rejectedBy,
      action: 'REFUND_REJECTED',
      entityType: 'Refund',
      entityId: refund._id,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'REJECTED', rejectedBy, rejectionReason },
    });
    return refund;
  }

  async processRefund(refundId, processedBy) {
    const refund = await Refund.findById(refundId);
    if (!refund) throw new NotFoundError('Refund request not found', 'REFUND_NOT_FOUND');
    if (refund.status === 'PENDING') throw new BadRequestError('Refund must be approved before processing', 'REFUND_NOT_APPROVED');
    if (refund.status === 'REJECTED') throw new BadRequestError('Cannot process a rejected refund', 'REFUND_REJECTED');
    if (refund.status === 'PROCESSED') throw new BadRequestError('Refund has already been processed', 'REFUND_ALREADY_PROCESSED');

    const order = await Order.findById(refund.orderId);
    const payment = await Payment.findById(refund.paymentId);

    refund.status = 'PROCESSED';
    refund.processedBy = processedBy;
    refund.processedAt = new Date();
    await refund.save();

    const totalRefunded = await this.getTotalRefundedForPayment(refund.paymentId);
    if (totalRefunded >= payment.amount) {
      order.paymentStatus = 'REFUNDED';
      payment.status = 'REFUNDED';
    }
    await order.save();
    await payment.save();

    await auditService.logAction({
      organizationId: refund.organizationId,
      branchId: refund.branchId,
      userId: processedBy,
      action: 'REFUND_PROCESSED',
      entityType: 'Refund',
      entityId: refund._id,
      oldValue: { status: 'APPROVED' },
      newValue: { status: 'PROCESSED', processedBy, totalRefunded, orderPaymentStatus: order.paymentStatus },
    });
    return refund;
  }

  async getRefundById(refundId) {
    return Refund.findById(refundId)
      .populate('paymentId', 'amount currency provider status')
      .populate('orderId', 'orderNumber total paymentStatus orderStatus')
      .populate('requestedBy', 'name role email')
      .populate('approvedBy', 'name role email')
      .populate('rejectedBy', 'name role email')
      .populate('processedBy', 'name role email');
  }

  async listRefunds({ organizationId, branchId, status, page = 1, limit = 20 }) {
    const filter = {};
    if (organizationId) filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    if (branchId) filter.branchId = new mongoose.Types.ObjectId(branchId);
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate('paymentId', 'amount currency provider status')
        .populate('orderId', 'orderNumber total paymentStatus orderStatus')
        .populate('requestedBy', 'name role email')
        .populate('approvedBy', 'name role email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Refund.countDocuments(filter),
    ]);
    return { refunds, page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) };
  }

  async getRefundStats({ organizationId, branchId, days = 30 }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const match = { createdAt: { $gte: startDate } };
    if (organizationId) match.organizationId = new mongoose.Types.ObjectId(organizationId);
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);
    const stats = await Refund.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          totalRefundRequests: { $sum: 1 },
          totalRefundAmount: { $sum: '$amount' },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          processedCount: { $sum: { $cond: [{ $eq: ['$status', 'PROCESSED'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
          processedAmount: { $sum: { $cond: [{ $eq: ['$status', 'PROCESSED'] }, '$amount', 0] } },
        },
      },
    ]);
    return stats[0] || {
      totalRefundRequests: 0, totalRefundAmount: 0, pendingCount: 0,
      approvedCount: 0, processedCount: 0, rejectedCount: 0, processedAmount: 0,
    };
  }

  async getRefundablePayments(orderId) {
    const payments = await Payment.find({ orderId: new mongoose.Types.ObjectId(orderId), status: 'PAID' });
    const result = [];
    for (const payment of payments) {
      const alreadyRefunded = await this.getTotalRefundedForPayment(payment._id);
      result.push({ payment, refundableAmount: Math.max(0, payment.amount - alreadyRefunded), alreadyRefunded });
    }
    return result;
  }
}

module.exports = new RefundService();
