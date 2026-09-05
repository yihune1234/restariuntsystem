const mongoose = require('mongoose');
const { Order } = require('../orders/order.model');
const { Payment } = require('../payments/payment.model');
const { Table } = require('../tables/table.model');
const FoodItem = require('../menu/food/food.model');
const { getTodayBusinessDate } = require('../../utils/date');

class ReportService {
  _getBusinessDate(dateString) {
    if (dateString) {
      const d = new Date(dateString);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    }
    return getTodayBusinessDate();
  }

  _parseDateRange(query, defaultDays = 7) {
    const startDate = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : new Date(new Date().setDate(new Date().getDate() - defaultDays));
    const endDate = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : new Date();
    return { startDate, endDate };
  }

  async getSalesReport({ startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate, endDate });

    const salesAggregation = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalSubtotal: { $sum: '$subtotal' },
          totalTax: { $sum: '$tax' },
          totalDiscount: { $sum: '$discount' },
          totalServiceCharge: { $sum: '$serviceCharge' },
          paidOrderCount: { $sum: 1 },
        },
      },
    ]);

    const summary = salesAggregation[0] || {
      totalRevenue: 0,
      totalSubtotal: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalServiceCharge: 0,
      paidOrderCount: 0,
    };

    return {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary,
    };
  }

  async getOrdersReport({ startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate, endDate });

    const statusCounts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' },
        },
      },
    ]);

    const sourceCounts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
    ]);

    const cancelledOrders = await Order.aggregate([
      {
        $match: {
          orderStatus: 'CANCELLED',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRefund: { $sum: '$total' },
        },
      },
    ]);

    return {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      byStatus: statusCounts,
      bySource: sourceCounts,
      cancelled: cancelledOrders[0] || { count: 0, totalRefund: 0 },
    };
  }

  async getPaymentsReport({ startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate, endDate });

    const paymentsBreakdown = await Payment.aggregate([
      {
        $match: {
          status: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$provider',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    return {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      breakdown: paymentsBreakdown,
    };
  }

  async getFoodReport({ startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate, endDate });

    const foodSales = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.foodItemId',
          foodName: { $first: '$items.foodNameSnapshot' },
          categoryName: { $first: '$items.categorySnapshot' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 25 },
    ]);

    const categoryBreakdown = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.categorySnapshot',
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    return {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      topSellingFood: foodSales,
      categoryBreakdown,
    };
  }

  async getDashboardKPIs() {
    const businessDate = getTodayBusinessDate();
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const now = new Date();

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay },
    });

    const todayPayments = await Payment.find({
      status: 'PAID',
      createdAt: { $gte: startOfDay },
    });

    const tables = await Table.find({
      isActive: true,
    });

    const unpaidOrders = todayOrders.filter(o =>
      o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PENDING'
    );

    const activeOrders = todayOrders.filter(o =>
      !['CANCELLED', 'COMPLETED'].includes(o.orderStatus)
    );

    const preparingOrders = todayOrders.filter(o =>
      o.orderStatus === 'PREPARING'
    );

    const readyOrders = todayOrders.filter(o =>
      o.orderStatus === 'READY'
    );

    const completedOrders = todayOrders.filter(o =>
      o.orderStatus === 'COMPLETED'
    );

    const cancelledOrders = todayOrders.filter(o =>
      o.orderStatus === 'CANCELLED'
    );

    const pendingOrders = todayOrders.filter(o =>
      o.orderStatus === 'PENDING'
    );

    const totalRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscount = todayOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const totalRefunds = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

    const cashSales = todayPayments
      .filter(p => p.provider === 'CASHIER_CASH' || p.provider === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);

    const cardSales = todayPayments
      .filter(p => p.provider === 'CASHIER_CARD' || p.provider === 'CARD')
      .reduce((sum, p) => sum + p.amount, 0);

    const digitalSales = todayPayments
      .filter(p => ['CHAPA', 'TELEBIRR', 'CASHIER_BANK_TRANSFER', 'BANK_TRANSFER'].includes(p.provider))
      .reduce((sum, p) => sum + p.amount, 0);

    const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');
    const availableTables = tables.filter(t => t.status === 'AVAILABLE');

    const qrOrders = todayOrders.filter(o =>
      ['CUSTOMER_QR', 'CUSTOMER_ONLINE'].includes(o.source)
    );
    const cashierOrders = todayOrders.filter(o => o.source === 'CASHIER');
    const manualOrders = todayOrders.filter(o => o.source === 'MANUAL');

    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

    const sourceBreakdown = {
      QR: { count: qrOrders.length, revenue: qrOrders.reduce((s, o) => s + o.total, 0) },
      Cashier: { count: cashierOrders.length, revenue: cashierOrders.reduce((s, o) => s + o.total, 0) },
      Manual: { count: manualOrders.length, revenue: manualOrders.reduce((s, o) => s + o.total, 0) },
    };

    const paymentBreakdown = {
      Cash: { amount: cashSales, count: todayPayments.filter(p => p.provider === 'CASHIER_CASH' || p.provider === 'CASH').length },
      Card: { amount: cardSales, count: todayPayments.filter(p => p.provider === 'CASHIER_CARD' || p.provider === 'CARD').length },
      Digital: { amount: digitalSales, count: todayPayments.filter(p => ['CHAPA', 'TELEBIRR', 'CASHIER_BANK_TRANSFER', 'BANK_TRANSFER'].includes(p.provider)).length },
    };

    return {
      businessDate,
      timestamp: now.toISOString(),
      kpis: {
        revenue: {
          total: totalRevenue,
          net: totalRevenue - totalRefunds,
          gross: totalRevenue + totalDiscount,
          discount: totalDiscount,
          refund: totalRefunds,
          unpaid: unpaidAmount,
        },
        orders: {
          total: todayOrders.length,
          active: activeOrders.length,
          pending: pendingOrders.length,
          preparing: preparingOrders.length,
          ready: readyOrders.length,
          completed: completedOrders.length,
          cancelled: cancelledOrders.length,
          unpaid: unpaidOrders.length,
          averageValue: avgOrderValue,
        },
        tables: {
          total: tables.length,
          occupied: occupiedTables.length,
          available: availableTables.length,
        },
        sourceBreakdown,
        paymentBreakdown,
      },
    };
  }

  async getHourlySalesAnalysis() {
    const businessDate = getTodayBusinessDate();
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);

    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentStatus: 'PAID',
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hourData = orders.find(o => o._id === i);
      return {
        hour: i,
        revenue: hourData?.revenue || 0,
        orders: hourData?.orders || 0,
      };
    });

    return {
      businessDate,
      hourlyData,
    };
  }
}

module.exports = new ReportService();
