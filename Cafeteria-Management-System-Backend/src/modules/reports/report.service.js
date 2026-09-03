const mongoose = require('mongoose');
const { Order } = require('../orders/order.model');
const { Payment } = require('../payments/payment.model');
const DailyStock = require('../inventory/daily-stock.model');
const Branch = require('../branches/branch.model');
const { Table } = require('../tables/table.model');
const { getTodayBusinessDate } = require('../../utils/date');

class ReportService {
  /**
   * Get the business date for a given date string or today
   */
  _getBusinessDate(dateString) {
    if (dateString) {
      const d = new Date(dateString);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    }
    return getTodayBusinessDate();
  }

  /**
   * Parse date range from query or defaults
   */
  _parseDateRange(query, defaultDays = 7) {
    const startDate = query.startDate ? new Date(`${query.startDate}T00:00:00.000Z`) : new Date(new Date().setDate(new Date().getDate() - defaultDays));
    const endDate = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : new Date();
    return { startDate, endDate };
  }

  /**
   * Branch Sales Report
   */
  async getBranchSalesReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const salesAggregation = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
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
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary,
    };
  }

  /**
   * Branch Order Status & Volume Report
   */
  async getBranchOrdersReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const statusCounts = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
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
          branchId: new mongoose.Types.ObjectId(branchId),
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
          branchId: new mongoose.Types.ObjectId(branchId),
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
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      byStatus: statusCounts,
      bySource: sourceCounts,
      cancelled: cancelledOrders[0] || { count: 0, totalRefund: 0 },
    };
  }

  /**
   * Branch Payment Provider Breakdown
   */
  async getBranchPaymentsReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const paymentsBreakdown = await Payment.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
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
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      breakdown: paymentsBreakdown,
    };
  }

  /**
   * Popular Food Items & Sales Breakdown
   */
  async getBranchFoodReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const foodSales = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.foodItemId',
          foodName: { $first: '$items.foodNameSnapshot' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 25 },
    ]);

    // Stock consumption for the period
    const stockConsumption = await DailyStock.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          businessDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$foodItemId',
          foodName: { $first: '$foodItemId' },
          openingStock: { $first: '$openingStock' },
          stockAdded: { $sum: '$stockAdded' },
          stockConsumed: { $sum: '$stockConsumed' },
          wastage: { $sum: '$wastage' },
          adjustments: { $sum: '$adjustments' },
          closingStock: { $last: '$currentStock' },
        },
      },
      { $sort: { foodName: 1 } },
    ]);

    return {
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      topSellingFood: foodSales,
      stockConsumption,
    };
  }

  /**
   * Kitchen & Delivery Operational Velocity
   */
  async getBranchOperationsReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const velocity = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          confirmedAt: { $ne: null },
          readyAt: { $ne: null },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          prepTimeMinutes: {
            $divide: [{ $subtract: ['$readyAt', '$confirmedAt'] }, 1000 * 60],
          },
          deliveryTimeMinutes: {
            $cond: [
              { $and: ['$readyAt', '$deliveredAt'] },
              { $divide: [{ $subtract: ['$deliveredAt', '$readyAt'] }, 1000 * 60] },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgPrepTimeMinutes: { $avg: '$prepTimeMinutes' },
          avgDeliveryTimeMinutes: { $avg: '$deliveryTimeMinutes' },
          completedOrdersAnalyzed: { $sum: 1 },
        },
      },
    ]);

    return {
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      operations: velocity[0] || {
        avgPrepTimeMinutes: 0,
        avgDeliveryTimeMinutes: 0,
        completedOrdersAnalyzed: 0,
      },
    };
  }

  /**
   * Role-Based Activity Report
   * Shows what each role completed during the selected period
   */
  async getBranchActivityReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    // Cashier activities: orders created and payments recorded
    const cashierActivities = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: start, $lte: end },
          source: 'CASHIER',
        },
      },
      {
        $group: {
          _id: '$source',
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // Payment activities by cashier
    const paymentActivities = await Payment.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
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

    // Waiter activities: orders created
    const waiterActivities = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: start, $lte: end },
          source: 'WAITER',
        },
      },
      {
        $group: {
          _id: '$source',
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // Kitchen activities: orders prepared and completed
    const kitchenPrepared = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          orderStatus: 'READY',
          readyAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const kitchenCompleted = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          orderStatus: 'TAKEN_BY_WAITER',
          deliveredAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    // Manager activities: menu changes, inventory updates, staff actions
    // We'll use audit logs for this
    const auditLogs = await global.AuditLog.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: 1 })
      .limit(100);

    return {
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      cashier: cashierActivities[0] || { orderCount: 0 },
      payments: paymentActivities,
      waiter: waiterActivities[0] || { orderCount: 0 },
      kitchen: {
        prepared: kitchenPrepared[0] ? kitchenPrepared[0].count : 0,
        completed: kitchenCompleted[0] ? kitchenCompleted[0].count : 0,
      },
      auditLogs,
    };
  }

  /**
   * Inventory Consumption Report
   * Shows item stock movements for the period
   */
  async getBranchInventoryReport(branchId, { startDate, endDate }) {
    const { startDate: start, endDate: end } = this._parseDateRange({ startDate: startDate, endDate: endDate });

    const stockMovements = await DailyStock.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          businessDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$foodItemId',
          foodName: { $first: '$foodItemSnapshot' },
          openingStock: { $first: '$openingStock' },
          stockAdded: { $sum: '$stockAdded' },
          stockConsumed: { $sum: '$stockConsumed' },
          wastage: { $sum: '$wastage' },
          adjustments: { $sum: '$adjustments' },
          closingStock: { $last: '$currentStock' },
        },
      },
      { $sort: { foodName: 1 } },
    ]);

    // Calculate current status for each item
    const stockItems = await Promise.all(
      stockMovements.map(async (item) => {
        const currentStock = await DailyStock.findOne({
          branchId: new mongoose.Types.ObjectId(branchId),
          foodItemId: item._id,
          businessDate: getTodayBusinessDate(),
        }).select('currentStock');

        const status = currentStock && currentStock.currentStock <= 0 ? 'Out of Stock' :
                      currentStock && currentStock.currentStock < 5 ? 'Low Stock' : 'Available';

        return {
          ...item,
          currentStatus: status,
          currentStock: currentStock ? currentStock.currentStock : item.closingStock,
        };
      })
    );

    return {
      branchId,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      stockItems,
    };
  }

  /**
   * Organization-wide inventory overview (Owner only)
   */
  async getOrganizationInventoryOverview(organizationId) {
    const branches = await Branch.find({ organizationId, deletedAt: null });
    const branchIds = branches.map((b) => b._id);

    const stockMovements = await DailyStock.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
        },
      },
      {
        $group: {
          _id: '$foodItemId',
          foodName: { $first: '$foodItemSnapshot' },
          totalOpening: { $sum: '$openingStock' },
          totalAdded: { $sum: '$stockAdded' },
          totalConsumed: { $sum: '$stockConsumed' },
          totalWastage: { $sum: '$wastage' },
          totalAdjustments: { $sum: '$adjustments' },
        },
      },
      { $sort: { foodName: 1 } },
    ]);

    return {
      organizationId,
      totalBranches: branches.length,
      stockItems: stockMovements,
    };
  }

  /**
   * Cross-branch analysis for Owner
   */
  async getBranchComparisonReport(organizationId) {
    const branches = await Branch.find({ organizationId, deletedAt: null });
    const branchIds = branches.map((b) => b._id);

    const comparison = await Order.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
          paymentStatus: 'PAID',
        },
      },
      {
        $group: {
          _id: '$branchId',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          wastage: { $sum: 0 },
        },
      },
    ]);

    const inventoryWastage = await DailyStock.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
        },
      },
      {
        $group: {
          _id: '$branchId',
          totalWastage: { $sum: '$wastage' },
        },
      },
    ]);

    const wastageMap = {};
    inventoryWastage.forEach(item => {
      wastageMap[item._id.toString()] = item.totalWastage || 0;
    });

    const lowStockCounts = await DailyStock.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
          currentStock: { $lt: 5 },
        },
      },
      {
        $group: {
          _id: '$branchId',
          lowStockCount: { $sum: 1 },
        },
      },
    ]);

    const lowStockMap = {};
    lowStockCounts.forEach(item => {
      lowStockMap[item._id.toString()] = item.lowStockCount || 0;
    });

    return {
      comparison,
      wastageMap,
      lowStockMap,
    };
  }

  /**
   * Organization Overview for Owner Dashboard
   */
  async getOrganizationOverview(organizationId) {
    const branches = await Branch.find({ organizationId, deletedAt: null });
    const branchIds = branches.map((b) => b._id);

    const overviewAggregation = await Order.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
          paymentStatus: 'PAID',
        },
      },
      {
        $group: {
          _id: null,
          totalLifetimeRevenue: { $sum: '$total' },
          totalPaidOrders: { $sum: 1 },
        },
      },
    ]);

    const overview = overviewAggregation[0] || {
      totalLifetimeRevenue: 0,
      totalPaidOrders: 0,
    };

    const branchPerformance = await Order.aggregate([
      {
        $match: {
          branchId: { $in: branchIds },
          paymentStatus: 'PAID',
        },
      },
      {
        $group: {
          _id: '$branchId',
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    return {
      overview,
      branchPerformance,
      totalBranches: branches.length,
    };
  }

  /**
   * Real-time KPIs for Owner Dashboard - Today's metrics
   */
  async getOwnerDashboardKPIs(organizationId, branchId = null) {
    const businessDate = getTodayBusinessDate();
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const now = new Date();

    const branches = await Branch.find({ 
      organizationId, 
      deletedAt: null 
    }).select('_id name');
    
    const branchIds = branchId 
      ? [new mongoose.Types.ObjectId(branchId)]
      : branches.map(b => b._id);

    const branchFilter = branchId 
      ? { branchId: new mongoose.Types.ObjectId(branchId) }
      : { branchId: { $in: branchIds } };

    const todayOrders = await Order.find({
      ...branchFilter,
      createdAt: { $gte: startOfDay },
    });

    const todayPayments = await Payment.find({
      ...branchFilter,
      status: 'PAID',
      createdAt: { $gte: startOfDay },
    });

    const tables = await Table.find({
      ...branchFilter,
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

    const totalRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscount = todayOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const totalRefunds = todayOrders
      .filter(o => o.orderStatus === 'CANCELLED')
      .reduce((sum, o) => sum + o.total, 0);

    const cashSales = todayPayments
      .filter(p => p.provider === 'CASHIER_CASH')
      .reduce((sum, p) => sum + p.amount, 0);

    const cardSales = todayPayments
      .filter(p => p.provider === 'CASHIER_CARD')
      .reduce((sum, p) => sum + p.amount, 0);

    const digitalSales = todayPayments
      .filter(p => ['CHAPA', 'TELEBIRR', 'CASHIER_BANK_TRANSFER'].includes(p.provider))
      .reduce((sum, p) => sum + p.amount, 0);

    const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');
    const availableTables = tables.filter(t => t.status === 'AVAILABLE');
    const reservedTables = tables.filter(t => t.status === 'RESERVED');

    const qrOrders = todayOrders.filter(o => 
      ['CUSTOMER_QR', 'CUSTOMER_ONLINE'].includes(o.source)
    );
    const waiterOrders = todayOrders.filter(o => o.source === 'WAITER');
    const cashierOrders = todayOrders.filter(o => o.source === 'CASHIER');
    const manualOrders = todayOrders.filter(o => o.source === 'MANUAL');

    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = completedOrders.length > 0 
      ? totalRevenue / completedOrders.length 
      : 0;

    const sourceBreakdown = {
      QR: { count: qrOrders.length, revenue: qrOrders.reduce((s, o) => s + o.total, 0) },
      Waiter: { count: waiterOrders.length, revenue: waiterOrders.reduce((s, o) => s + o.total, 0) },
      Cashier: { count: cashierOrders.length, revenue: cashierOrders.reduce((s, o) => s + o.total, 0) },
      Manual: { count: manualOrders.length, revenue: manualOrders.reduce((s, o) => s + o.total, 0) },
    };

    const paymentBreakdown = {
      Cash: { amount: cashSales, count: todayPayments.filter(p => p.provider === 'CASHIER_CASH').length },
      Card: { amount: cardSales, count: todayPayments.filter(p => p.provider === 'CASHIER_CARD').length },
      Digital: { amount: digitalSales, count: todayPayments.filter(p => ['CHAPA', 'TELEBIRR', 'CASHIER_BANK_TRANSFER'].includes(p.provider)).length },
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
          reserved: reservedTables.length,
        },
        sourceBreakdown,
        paymentBreakdown,
      },
      branches: branchId ? null : branches.map(b => ({
        id: b._id,
        name: b.name,
      })),
    };
  }

  /**
   * Hourly sales analysis for the current day
   */
  async getHourlySalesAnalysis(branchId) {
    const businessDate = getTodayBusinessDate();
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);

    const orders = await Order.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
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