const mongoose = require('mongoose');
const { Order } = require('../orders/order.model');
const { Payment } = require('../payments/payment.model');
const { AuditLog } = require('../audit/audit.model');
const { User } = require('../users/user.model');

class FraudDetectionService {
  constructor() {
    this.thresholds = {
      excessiveCancellations: 5,
      highDiscountPercent: 0.3,
      excessiveRefunds: 3,
      largeInventoryDiscrepancy: 0.15,
      excessiveManualTransactions: 10,
    };
  }

  async detectSuspiciousActivities(branchId, organizationId, startDate, endDate) {
    const warnings = [];

    await this.checkExcessiveCancellations(branchId, organizationId, startDate, endDate, warnings);
    await this.checkHighDiscounts(branchId, organizationId, startDate, endDate, warnings);
    await this.checkExcessiveRefunds(branchId, organizationId, startDate, endDate, warnings);
    await this.checkCancelledAfterPreparation(branchId, organizationId, startDate, endDate, warnings);
    await this.checkCashShortages(branchId, organizationId, startDate, endDate, warnings);
    await this.checkExcessiveManualTransactions(branchId, organizationId, startDate, endDate, warnings);
    await this.checkUnpaidToCompleted(branchId, organizationId, startDate, endDate, warnings);
    await this.checkRepeatedBillChanges(branchId, organizationId, startDate, endDate, warnings);

    return warnings;
  }

  async checkExcessiveCancellations(branchId, organizationId, startDate, endDate, warnings) {
    const cancellationCounts = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          orderStatus: 'CANCELLED',
          cancelledAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: '$createdBy',
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gte: this.thresholds.excessiveCancellations },
        },
      },
    ]);

    for (const item of cancellationCounts) {
      const user = await User.findById(item._id).select('name role');
      warnings.push({
        type: 'EXCESSIVE_CANCELLATIONS',
        severity: 'HIGH',
        employeeId: item._id,
        employeeName: user?.name || 'Unknown',
        employeeRole: user?.role || 'Unknown',
        count: item.count,
        message: `${user?.name || 'Employee'} (${user?.role}) cancelled ${item.count} orders - exceeds threshold of ${this.thresholds.excessiveCancellations}`,
      });
    }
  }

  async checkHighDiscounts(branchId, organizationId, startDate, endDate, warnings) {
    const highDiscountOrders = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          discount: { $gt: 0 },
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $addFields: {
          discountPercent: {
            $cond: [
              { $gt: ['$subtotal', 0] },
              { $divide: ['$discount', '$subtotal'] },
              0,
            ],
          },
        },
      },
      {
        $match: {
          discountPercent: { $gte: this.thresholds.highDiscountPercent },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator',
        },
      },
    ]);

    for (const order of highDiscountOrders) {
      const creator = order.creator[0];
      warnings.push({
        type: 'HIGH_DISCOUNT',
        severity: 'MEDIUM',
        orderId: order._id,
        orderNumber: order.orderNumber,
        employeeId: order.createdBy,
        employeeName: creator?.name || 'Unknown',
        employeeRole: creator?.role || 'Unknown',
        discountPercent: (order.discountPercent * 100).toFixed(1),
        discountAmount: order.discount,
        orderTotal: order.total,
        message: `Order #${order.orderNumber} has ${(order.discountPercent * 100).toFixed(1)}% discount (${order.discount} ETB) by ${creator?.name || 'Unknown'}`,
      });
    }
  }

  async checkExcessiveRefunds(branchId, organizationId, startDate, endDate, warnings) {
    const refundCounts = await Payment.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          status: 'REFUNDED',
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: '$processedBy',
          count: { $sum: 1 },
          totalRefunded: { $sum: '$amount' },
        },
      },
      {
        $match: {
          count: { $gte: this.thresholds.excessiveRefunds },
        },
      },
    ]);

    for (const item of refundCounts) {
      const user = await User.findById(item._id).select('name role');
      warnings.push({
        type: 'EXCESSIVE_REFUNDS',
        severity: 'HIGH',
        employeeId: item._id,
        employeeName: user?.name || 'Unknown',
        employeeRole: user?.role || 'Unknown',
        count: item.count,
        totalRefunded: item.totalRefunded,
        message: `${user?.name || 'Employee'} (${user?.role}) processed ${item.count} refunds totaling ${item.totalRefunded} ETB`,
      });
    }
  }

  async checkCancelledAfterPreparation(branchId, organizationId, startDate, endDate, warnings) {
    const suspiciousCancellations = await Order.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      orderStatus: 'CANCELLED',
      cancelledAt: { $exists: true, $ne: null },
      preparedAt: { $exists: true, $ne: null },
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate('createdBy', 'name role')
      .populate('assignedWaiterId', 'name');

    for (const order of suspiciousCancellations) {
      if (order.preparedAt && order.cancelledAt) {
        const timeBetweenPrepAndCancel = order.cancelledAt - order.preparedAt;
        const thirtyMinutes = 30 * 60 * 1000;

        if (timeBetweenPrepAndCancel < thirtyMinutes) {
          warnings.push({
            type: 'CANCELLED_AFTER_PREPARATION',
            severity: 'HIGH',
            orderId: order._id,
            orderNumber: order.orderNumber,
            employeeId: order.createdBy?._id,
            employeeName: order.createdBy?.name || 'Unknown',
            employeeRole: order.createdBy?.role || 'Unknown',
            timeBetweenMinutes: Math.round(timeBetweenPrepAndCancel / 60000),
            message: `Order #${order.orderNumber} was cancelled only ${Math.round(timeBetweenPrepAndCancel / 60000)} minutes after preparation`,
          });
        }
      }
    }
  }

  async checkCashShortages(branchId, organizationId, startDate, endDate, warnings) {
    const cashPayments = await Payment.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          provider: 'CASHIER_CASH',
          status: 'PAID',
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: '$processedBy',
          totalCash: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    for (const item of cashPayments) {
      const user = await User.findById(item._id).select('name role');
      if (user && ['cashier', 'manager'].includes(user.role)) {
        warnings.push({
          type: 'CASH_HANDLING',
          severity: 'LOW',
          employeeId: item._id,
          employeeName: user.name,
          employeeRole: user.role,
          totalCash: item.totalCash,
          transactionCount: item.count,
          message: `Cashier ${user.name} handled ${item.totalCash} ETB in ${item.count} transactions`,
        });
      }
    }
  }

  async checkExcessiveManualTransactions(branchId, organizationId, startDate, endDate, warnings) {
    const manualOrderCounts = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          source: 'MANUAL',
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: '$createdBy',
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gte: this.thresholds.excessiveManualTransactions },
        },
      },
    ]);

    for (const item of manualOrderCounts) {
      const user = await User.findById(item._id).select('name role');
      warnings.push({
        type: 'EXCESSIVE_MANUAL_TRANSACTIONS',
        severity: 'MEDIUM',
        employeeId: item._id,
        employeeName: user?.name || 'Unknown',
        employeeRole: user?.role || 'Unknown',
        count: item.count,
        message: `${user?.name || 'Employee'} entered ${item.count} manual orders - may indicate offline mode usage or abuse`,
      });
    }
  }

  async checkUnpaidToCompleted(branchId, organizationId, startDate, endDate, warnings) {
    const suspiciousOrders = await Order.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      paymentStatus: { $nin: ['PAID', 'PENDING', 'UNPAID'] },
      orderStatus: 'COMPLETED',
      completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate('createdBy', 'name role');

    for (const order of suspiciousOrders) {
      warnings.push({
        type: 'UNPAID_COMPLETED',
        severity: 'HIGH',
        orderId: order._id,
        orderNumber: order.orderNumber,
        employeeId: order.createdBy?._id,
        employeeName: order.createdBy?.name || 'Unknown',
        employeeRole: order.createdBy?.role || 'Unknown',
        paymentStatus: order.paymentStatus,
        orderTotal: order.total,
        message: `Order #${order.orderNumber} marked COMPLETED but payment status is ${order.paymentStatus}`,
      });
    }
  }

  async checkRepeatedBillChanges(branchId, organizationId, startDate, endDate, warnings) {
    const priceChanges = await AuditLog.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      action: 'CHANGE_PRICE',
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate('userId', 'name role')
      .sort({ createdAt: -1 });

    const userChanges = {};
    priceChanges.forEach(log => {
      if (log.userId) {
        const userId = log.userId._id.toString();
        if (!userChanges[userId]) {
          userChanges[userId] = { user: log.userId, changes: [] };
        }
        userChanges[userId].changes.push(log);
      }
    });

    for (const [userId, data] of Object.entries(userChanges)) {
      if (data.changes.length >= 5) {
        warnings.push({
          type: 'FREQUENT_PRICE_CHANGES',
          severity: 'MEDIUM',
          employeeId: userId,
          employeeName: data.user.name,
          employeeRole: data.user.role,
          changeCount: data.changes.length,
          message: `${data.user.name} changed prices ${data.changes.length} times - may indicate price manipulation`,
        });
      }
    }
  }

  async getFraudSummary(branchId, organizationId, days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const warnings = await this.detectSuspiciousActivities(
      branchId,
      organizationId,
      startDate,
      endDate
    );

    const bySeverity = {
      HIGH: warnings.filter(w => w.severity === 'HIGH'),
      MEDIUM: warnings.filter(w => w.severity === 'MEDIUM'),
      LOW: warnings.filter(w => w.severity === 'LOW'),
    };

    const byType = {};
    warnings.forEach(w => {
      if (!byType[w.type]) byType[w.type] = [];
      byType[w.type].push(w);
    });

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), days },
      totalWarnings: warnings.length,
      bySeverity,
      byType,
      recentAlerts: warnings.slice(0, 20),
    };
  }
}

module.exports = new FraudDetectionService();