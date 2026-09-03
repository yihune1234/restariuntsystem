const mongoose = require('mongoose');
const { DailyClosing, CLOSING_STATUSES } = require('./daily-closing.model');
const { Order, PAYMENT_STATUSES, ORDER_STATUSES } = require('../orders/order.model');
const { Payment, PAYMENT_STATUSES: PAYMENT_PAYMENT_STATUSES } = require('../payments/payment.model');
const { getTodayBusinessDate } = require('../../utils/date');
const auditService = require('../audit/audit.service');

class DailyClosingService {
  async getOrCreateClosing(branchId, organizationId, businessDate = null) {
    const date = businessDate || getTodayBusinessDate();

    // resolve organizationId from the branch when not supplied (defensive).
    let orgId = organizationId;
    if (!orgId) {
      const branch = await require('../branches/branch.model').findOne({ _id: branchId, deletedAt: null }).select('organizationId');
      orgId = branch ? branch.organizationId : null;
    }

    let closing = await DailyClosing.findOne({
      branchId,
      businessDate: date,
    });

    if (!closing) {
      closing = await DailyClosing.create({
        branchId,
        organizationId: orgId,
        businessDate: date,
        status: 'OPEN',
      });
    }

    return closing;
  }

  async calculateDaySummary(branchId, businessDate = null) {
    const date = businessDate || getTodayBusinessDate();
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const orders = await Order.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const payments = await Payment.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'PAID',
    });

    const summary = {
      totalOrders: 0,
      totalRevenue: 0,
      totalSubtotal: 0,
      totalTax: 0,
      totalServiceCharge: 0,
      totalDiscount: 0,
      totalRefunds: 0,
      cashSales: 0,
      cardSales: 0,
      digitalSales: 0,
      unpaidAmount: 0,
      writtenOffAmount: 0,
      manualTransactions: 0,
      cancelledOrders: 0,
    };

    const paymentBreakdown = {
      CASHIER_CASH: 0,
      CASHIER_CARD: 0,
      CASHIER_BANK_TRANSFER: 0,
      CHAPA: 0,
      TELEBIRR: 0,
    };

    const orderSourceBreakdown = {
      CUSTOMER_QR: 0,
      CUSTOMER_ONLINE: 0,
      WAITER: 0,
      CASHIER: 0,
      KIOSK: 0,
      MANUAL: 0,
    };

    orders.forEach(order => {
      summary.totalOrders++;
      summary.totalSubtotal += order.subtotal || 0;
      summary.totalTax += order.tax || 0;
      summary.totalServiceCharge += order.serviceCharge || 0;
      summary.totalDiscount += order.discount || 0;

      if (order.orderStatus === 'CANCELLED') {
        summary.cancelledOrders++;
        summary.totalRefunds += order.total || 0;
      } else {
        summary.totalRevenue += order.total || 0;
      }

      if (order.source === 'MANUAL' || order.source === 'KIOSK') {
        summary.manualTransactions++;
      }

      orderSourceBreakdown[order.source] = (orderSourceBreakdown[order.source] || 0) + (order.total || 0);

      if (order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PENDING') {
        summary.unpaidAmount += order.total || 0;
      }
    });

    payments.forEach(payment => {
      if (payment.provider === 'CASHIER_CASH') {
        summary.cashSales += payment.amount;
        paymentBreakdown.CASHIER_CASH += payment.amount;
      } else if (payment.provider === 'CASHIER_CARD') {
        summary.cardSales += payment.amount;
        paymentBreakdown.CASHIER_CARD += payment.amount;
      } else if (payment.provider === 'CASHIER_BANK_TRANSFER') {
        summary.digitalSales += payment.amount;
        paymentBreakdown.CASHIER_BANK_TRANSFER += payment.amount;
      } else if (payment.provider === 'CHAPA') {
        summary.digitalSales += payment.amount;
        paymentBreakdown.CHAPA += payment.amount;
      } else if (payment.provider === 'TELEBIRR') {
        summary.digitalSales += payment.amount;
        paymentBreakdown.TELEBIRR += payment.amount;
      }
    });

    summary.expectedCash = summary.cashSales;

    return { summary, paymentBreakdown, orderSourceBreakdown };
  }

  async openDay(branchId, organizationId, openingCash = 0) {
    const closing = await this.getOrCreateClosing(branchId, organizationId);
    
    if (closing.status !== 'OPEN') {
      throw new Error('Day is already closed. Cannot reopen.');
    }

    closing.openingCash = openingCash;
    await closing.save();

    await auditService.logAction({
      organizationId,
      branchId,
      action: 'DAY_OPENED',
      entityType: 'DailyClosing',
      entityId: closing._id,
      oldValue: null,
      newValue: { openingCash, businessDate: closing.businessDate },
    });

    return closing;
  }

  async closeDay(branchId, organizationId, actualCash, differenceReason = null, closedBy) {
    const closing = await this.getOrCreateClosing(branchId, organizationId);
    
    if (closing.status === 'CLOSED' || closing.status === 'RECONCILED') {
      throw new Error('Day is already closed.');
    }

    const { summary, paymentBreakdown, orderSourceBreakdown } = await this.calculateDaySummary(
      branchId,
      closing.businessDate
    );

    closing.summary = summary;
    closing.paymentBreakdown = paymentBreakdown;
    closing.orderSourceBreakdown = orderSourceBreakdown;
    closing.expectedCash = summary.expectedCash;
    closing.actualCash = actualCash;
    closing.cashDifference = actualCash - summary.expectedCash;
    closing.differenceReason = differenceReason;
    closing.status = 'CLOSED';
    closing.closedBy = closedBy;
    closing.closedAt = new Date();

    await closing.save();

    await auditService.logAction({
      organizationId,
      branchId,
      userId: closedBy,
      action: 'DAY_CLOSED',
      entityType: 'DailyClosing',
      entityId: closing._id,
      oldValue: null,
      newValue: {
        expectedCash: summary.expectedCash,
        actualCash,
        difference: closing.cashDifference,
        businessDate: closing.businessDate,
      },
    });

    return closing;
  }

  async reconcileDay(branchId, organizationId, reconciledBy, notes = '') {
    const closing = await this.getOrCreateClosing(branchId, organizationId);
    
    if (closing.status !== 'CLOSED') {
      throw new Error('Day must be closed before reconciliation.');
    }

    closing.status = 'RECONCILED';
    closing.reconciledBy = reconciledBy;
    closing.reconciledAt = new Date();
    closing.notes = notes;
    await closing.save();

    await auditService.logAction({
      organizationId,
      branchId,
      userId: reconciledBy,
      action: 'DAY_RECONCILED',
      entityType: 'DailyClosing',
      entityId: closing._id,
      oldValue: { status: 'CLOSED' },
      newValue: { status: 'RECONCILED', notes },
    });

    return closing;
  }

  async getClosingHistory(branchId, limit = 30) {
    return DailyClosing.find({ branchId })
      .sort({ businessDate: -1 })
      .limit(limit)
      .populate('closedBy', 'name role')
      .populate('reconciledBy', 'name role');
  }

  async getClosingByDate(branchId, businessDate) {
    return DailyClosing.findOne({
      branchId: new mongoose.Types.ObjectId(branchId),
      businessDate,
    }).populate('closedBy', 'name role').populate('reconciledBy', 'name role');
  }

  async getTodayMetrics(branchId) {
    const closing = await this.getOrCreateClosing(
      new mongoose.Types.ObjectId(branchId),
      null
    );
    
    const { summary, paymentBreakdown, orderSourceBreakdown } = await this.calculateDaySummary(branchId);

    return {
      businessDate: closing.businessDate,
      status: closing.status,
      summary,
      paymentBreakdown,
      orderSourceBreakdown,
      openingCash: closing.openingCash,
      expectedCash: summary.expectedCash,
      actualCash: closing.actualCash,
      cashDifference: closing.actualCash !== null ? closing.actualCash - summary.expectedCash : null,
    };
  }
}

module.exports = new DailyClosingService();