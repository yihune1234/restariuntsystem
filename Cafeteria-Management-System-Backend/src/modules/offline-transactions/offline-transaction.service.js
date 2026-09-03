const mongoose = require('mongoose');
const { OfflineTransaction, OFFLINE_STATUSES, RECONCILIATION_STATUSES, SYNC_STATUSES } = require('./offline-transaction.model');
const { Order } = require('../orders/order.model');
const { Payment } = require('../payments/payment.model');
const auditService = require('../audit/audit.service');
const stockService = require('../inventory/stock.service');
const socketEmitter = require('../../sockets/socket.emitter');
const { runInTransaction } = require('../../utils/transaction');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { getTodayBusinessDate } = require('../../utils/date');
const DailyStock = require('../inventory/daily-stock.model');

class OfflineTransactionService {
  async createOfflineTransaction(data) {
    const clientRefId = data.clientRefId || `otx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const existing = await OfflineTransaction.findOne({ clientRefId });
    if (existing) {
      throw new BadRequestError('Duplicate transaction: clientRefId already exists', 'DUPLICATE_CLIENT_REF');
    }

    const transaction = await OfflineTransaction.create({
      organizationId: new mongoose.Types.ObjectId(data.organizationId),
      branchId: new mongoose.Types.ObjectId(data.branchId),
      clientRefId,
      operationType: data.operationType || 'ORDER',
      syncStatus: data.syncStatus || 'PENDING_SYNC',
      metadata: data.metadata || {},
      stockData: data.stockData || null,
      orderData: data.orderData || null,
      paymentData: data.paymentData || null,
      originalTransactionTime: new Date(data.originalTransactionTime),
      enteredAt: new Date(),
      source: data.source || 'MANUAL',
      reason: data.reason,
      outageType: data.outageType || 'OTHER',
      items: data.items,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax,
      serviceCharge: data.serviceCharge || 0,
      total: data.total,
      paymentMethod: data.paymentMethod || 'UNSET',
      tableId: data.tableId ? new mongoose.Types.ObjectId(data.tableId) : null,
      customerCount: data.customerCount || 1,
      notes: data.notes || '',
      enteredBy: new mongoose.Types.ObjectId(data.enteredBy),
      status: OFFLINE_STATUSES.includes(data.status) ? data.status : 'DRAFT',
      reconciliationStatus: 'PENDING',
    });

    await auditService.logAction({
      organizationId: data.organizationId,
      branchId: data.branchId,
      userId: data.enteredBy,
      action: 'MANUAL_TRANSACTION_CREATED',
      entityType: 'OfflineTransaction',
      entityId: transaction._id,
      newValue: {
        clientRefId,
        operationType: data.operationType || 'ORDER',
        total: data.total,
        reason: data.reason,
        source: data.source,
        outageType: data.outageType,
      },
    });

    return transaction;
  }

  async getSyncStatus(branchId) {
    const result = await OfflineTransaction.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } },
      {
        $group: {
          _id: '$syncStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      PENDING_SYNC: 0,
      SYNCING: 0,
      SYNCED: 0,
      FAILED: 0,
      CONFLICT: 0,
    };

    result.forEach(r => {
      statusCounts[r._id] = r.count;
    });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return {
      branchId,
      total,
      statuses: statusCounts,
      lastSyncedAt: null,
    };
  }

  async getProblemRecords(branchId, { page = 1, limit = 20 } = {}) {
    const filter = {
      branchId: new mongoose.Types.ObjectId(branchId),
      syncStatus: { $in: ['FAILED', 'CONFLICT'] },
    };

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      OfflineTransaction.find(filter)
        .populate('enteredBy', 'name role')
        .populate('orderId', 'orderNumber total')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      OfflineTransaction.countDocuments(filter),
    ]);

    return {
      records,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async retrySync(transactionId) {
    const record = await OfflineTransaction.findById(transactionId);
    if (!record) {
      throw new NotFoundError('Offline transaction not found', 'OFFLINE_TX_NOT_FOUND');
    }

    if (record.syncStatus !== 'FAILED' && record.syncStatus !== 'CONFLICT') {
      throw new BadRequestError('Only FAILED or CONFLICT records can be retried', 'INVALID_RETRY');
    }

    record.syncStatus = 'PENDING_SYNC';
    record.syncError = null;
    record.conflictData = null;
    await record.save();

    return record;
  }

  async resolveConflict(transactionId, resolution) {
    const record = await OfflineTransaction.findById(transactionId);
    if (!record) {
      throw new NotFoundError('Offline transaction not found', 'OFFLINE_TX_NOT_FOUND');
    }

    if (record.syncStatus !== 'CONFLICT') {
      throw new BadRequestError('Only CONFLICT records can be resolved', 'INVALID_CONFLICT_RESOLUTION');
    }

    if (resolution.useOffline) {
      record.syncStatus = 'PENDING_SYNC';
      record.conflictData = null;
    } else {
      record.syncStatus = 'SYNCED';
      record.syncedAt = new Date();
      record.conflictData = null;
    }

    await record.save();

    await auditService.logAction({
      organizationId: record.organizationId,
      branchId: record.branchId,
      action: 'CONFLICT_RESOLVED',
      entityType: 'OfflineTransaction',
      entityId: record._id,
      newValue: {
        resolution: resolution.useOffline ? 'USE_OFFLINE' : 'USE_EXISTING',
        clientRefId: record.clientRefId,
      },
    });

    return record;
  }

  async approveTransaction(transactionId, approvedBy) {
    const transaction = await OfflineTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Transaction is not pending');
    }

    if (transaction.enteredBy.toString() === approvedBy.toString()) {
      throw new Error('Self-approval is not allowed. Another authorized user must approve.');
    }

    let result = {};

    if (transaction.operationType === 'ORDER') {
      result = await this.approveOrderTransaction(transaction, approvedBy);
    } else if (transaction.operationType === 'PAYMENT') {
      result = await this.approvePaymentTransaction(transaction, approvedBy);
    } else if (transaction.operationType === 'STOCK') {
      result = await this.approveStockTransaction(transaction, approvedBy);
    } else if (transaction.operationType === 'WASTE') {
      result = await this.approveWasteTransaction(transaction, approvedBy);
    } else if (transaction.operationType === 'EXPENSE') {
      result = await this.approveExpenseTransaction(transaction, approvedBy);
    } else {
      throw new Error(`Unsupported operation type: ${transaction.operationType}`);
    }

    transaction.status = 'APPROVED';
    transaction.approvedBy = new mongoose.Types.ObjectId(approvedBy);
    transaction.approvedAt = new Date();
    await transaction.save();

    await auditService.logAction({
      organizationId: transaction.organizationId,
      branchId: transaction.branchId,
      userId: approvedBy,
      action: 'MANUAL_TRANSACTION_APPROVED',
      entityType: 'OfflineTransaction',
      entityId: transaction._id,
      oldValue: { status: 'PENDING' },
      newValue: {
        status: 'APPROVED',
        operationType: transaction.operationType,
        reason: transaction.reason,
        ...result.auditData,
      },
    });

    // ---- Apply to the real system ----
    // The manual entry has been approved. Now we finalize the lifecycle:
    // APPROVED -> APPLIED, persist the resulting normal-system references, and
    // flip the sync/reconciliation flags so the entry is no longer pending.
    const appliedText = this.buildAppliedText(transaction.operationType, result);
    transaction.status = 'APPLIED';
    transaction.appliedAt = new Date();
    transaction.applicationResult = {
      orderId: result.order?._id || result.orderId || null,
      orderNumber: (result.order && result.order.orderNumber) || result.orderNumber || null,
      paymentId: result.payment?._id || result.paymentId || null,
      stockIds: result.stockIds || [],
      appliedText,
    };
    transaction.syncStatus = transaction.operationType === 'EXPENSE' ? transaction.syncStatus : 'SYNCED';
    transaction.syncedAt = new Date();
    transaction.reconciliationStatus = 'RECONCILED';
    transaction.reconciledAt = new Date();
    transaction.reconciledBy = new mongoose.Types.ObjectId(approvedBy);
    await transaction.save();

    await auditService.logAction({
      organizationId: transaction.organizationId,
      branchId: transaction.branchId,
      userId: approvedBy,
      action: 'MANUAL_TRANSACTION_APPLIED',
      entityType: 'OfflineTransaction',
      entityId: transaction._id,
      oldValue: { status: 'APPROVED' },
      newValue: { status: 'APPLIED', ...transaction.applicationResult },
    });

    return { transaction, ...result, appliedText };
  }

  /** Build a human-readable "Applied to System" summary for the record. */
  buildAppliedText(operationType, result) {
    const parts = [];
    if (result.order && result.order.orderNumber) {
      parts.push(`Created Order #${result.order.orderNumber}`);
    } else if (result.orderNumber) {
      parts.push(`Created Order #${result.orderNumber}`);
    }
    if (result.payment && result.payment.provider) {
      parts.push(`Payment created (${result.payment.provider})`);
    } else if (result.paymentId) {
      parts.push('Payment created');
    }
    if (result.stockIds && result.stockIds.length) {
      const refs = result.stockIds.map((id) => String(id).slice(-6).toUpperCase()).join(', ');
      parts.push(`Inventory Transaction${result.stockIds.length > 1 ? 's' : ''} #${refs}`);
    }
    if (parts.length) return parts.join(' → ');
    return `Applied ${operationType} entry to system`;
  }

  async approveOrderTransaction(transaction, approvedBy) {
    // Reuse the SAME normal order business logic: create a real Order record,
    // then (because the food was physically served during the outage) deduct
    // the real inventory through the standard atomic stock service.
    let orderResult = null;

    await runInTransaction(async (session) => {
      const order = await Order.create([{
        orderNumber: `OFFLINE-${Date.now()}`,
        organizationId: transaction.organizationId,
        branchId: transaction.branchId,
        tableId: transaction.tableId,
        customerSessionId: null,
        securityCode: `OF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        source: 'MANUAL',
        items: transaction.items.map(item => ({
          foodItemId: item.foodItemId,
          foodNameSnapshot: item.foodNameSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          subtotal: item.subtotal,
          notes: item.notes,
        })),
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        tax: transaction.tax,
        serviceCharge: transaction.serviceCharge,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        paymentStatus: transaction.paymentMethod === 'CASH' || transaction.paymentMethod === 'UNSET' ? 'PAID' : 'PENDING',
        orderStatus: 'COMPLETED',
        createdBy: transaction.enteredBy,
        completedAt: transaction.originalTransactionTime,
      }], { session });

      const savedOrder = order[0] || order;

      // Deduct real inventory for food physically used during the outage.
      const stockResult = await stockService.deductStockAtomic({
        items: transaction.items.map((it) => ({
          foodItemId: it.foodItemId,
          quantity: it.quantity,
          foodName: it.foodNameSnapshot,
        })),
        branchId: transaction.branchId,
        session,
      });

      let payment = null;
      if (transaction.paymentMethod !== 'UNSET' && transaction.paymentMethod !== 'CASH') {
        payment = await Payment.create([{
          orderId: savedOrder._id,
          branchId: transaction.branchId,
          organizationId: transaction.organizationId,
          amount: transaction.total,
          provider: transaction.paymentMethod === 'CARD' ? 'CASHIER_CARD' : transaction.paymentMethod,
          status: 'PAID',
          transactionReference: `OFFLINE-PAY-${Date.now()}`,
          processedBy: approvedBy,
          paidAt: transaction.originalTransactionTime,
        }], { session });
        payment = payment[0] || payment;
      }

      await OfflineTransaction.findByIdAndUpdate(transaction._id, { orderId: savedOrder._id }, { session });

      // Capture the affected inventory (DailyStock) record ids for the
      // "Inventory Transaction" reference shown on the applied result.
      const foodItemIds = transaction.items.map((it) => it.foodItemId);
      const affectedStocks = await DailyStock.find({
        branchId: transaction.branchId,
        foodItemId: { $in: foodItemIds },
        businessDate: getTodayBusinessDate(),
      }).session(session).select('_id');

      orderResult = {
        order: savedOrder,
        payment,
        stockResult,
        affectedStockIds: affectedStocks.map((s) => s._id),
      };
    });

    // Emit realtime events so Manager/Owner screens update without refresh.
    if (orderResult.payment) {
      socketEmitter.emitOrderConfirmed(orderResult.order);
    }
    socketEmitter.emitStockUpdated(transaction.branchId.toString(), {
      orderId: orderResult.order._id,
      fromManualEntry: true,
      manualEntryId: transaction._id,
    });

    const stockIds = orderResult.affectedStockIds || [];

    return {
      order: orderResult.order,
      payment: orderResult.payment,
      stockIds,
      auditData: {
        orderId: orderResult.order._id,
        orderNumber: orderResult.order.orderNumber,
        paymentId: orderResult.payment?._id || null,
        stockDeducted: transaction.items.reduce((sum, it) => sum + it.quantity, 0),
      },
    };
  }

  async approvePaymentTransaction(transaction, approvedBy) {
    // A manual payment records payment that physically occurred during the
    // outage. The Payment model requires a real order link, so the manual
    // entry must reference an existing order to become a legitimate system
    // payment attached to that order's bill.
    if (!transaction.paymentData?.orderId) {
      throw new BadRequestError(
        'Manual payment must reference an existing order (orderId required) to be applied',
        'PAYMENT_ORDER_REQUIRED'
      );
    }

    const order = await Order.findById(transaction.paymentData.orderId);
    if (!order) {
      throw new BadRequestError(`Related order '${transaction.paymentData.orderId}' not found`, 'RELATED_ORDER_NOT_FOUND');
    }

    const amount = transaction.paymentData.amount || transaction.total || 0;
    const method = transaction.paymentData.paymentMethod || transaction.paymentMethod;

    const provider =
      method === 'CARD' ? 'CASHIER_CARD' :
      method === 'BANK_TRANSFER' ? 'CASHIER_BANK_TRANSFER' :
      method === 'CASH' ? 'CASHIER_CASH' :
      method || 'CASHIER_CASH';

    const payment = await Payment.create({
      orderId: order._id,
      branchId: transaction.branchId,
      organizationId: transaction.organizationId,
      amount,
      provider,
      status: 'PAID',
      transactionReference: transaction.paymentData.transactionReference || `OFFLINE-PAY-${Date.now()}`,
      processedBy: approvedBy,
      paidAt: transaction.originalTransactionTime,
    });

    order.paymentStatus = 'PAID';
    order.paymentMethod = method;
    await order.save();

    return { payment, auditData: { paymentId: payment._id, orderId: order._id, provider } };
  }

  async approveStockTransaction(transaction, approvedBy) {
    if (!transaction.stockData) {
      throw new Error('Stock data missing');
    }

    const { foodItemId, operationType, changeQuantity } = transaction.stockData;
    const session = await mongoose.startSession();
    let stockResult;

    try {
      if (operationType === 'RECEIVED') {
        stockResult = await stockService.addStockAtomic({
          foodItemId,
          branchId: transaction.branchId,
          quantity: changeQuantity,
          reason: transaction.reason,
          session,
        });
      } else if (operationType === 'USED' || operationType === 'WASTE' || operationType === 'ADJUSTMENT') {
        stockResult = await stockService.recordWasteAtomic({
          foodItemId,
          branchId: transaction.branchId,
          quantity: changeQuantity,
          reason: transaction.reason,
          session,
        });
      } else {
        throw new Error(`Unknown stock operation type: ${operationType}`);
      }
    } finally {
      session.endSession();
    }

    socketEmitter.emitStockUpdated(transaction.branchId.toString(), {
      foodItemId,
      operationType,
      quantity: changeQuantity,
      remainingQuantity: stockResult.stock?.remainingQuantity,
      status: stockResult.stock?.status,
      fromManualEntry: true,
      manualEntryId: transaction._id,
    });

    if (stockResult.stock?.status === 'SOLD_OUT') {
      socketEmitter.emitFoodSoldOut(transaction.branchId.toString(), foodItemId.toString(), stockResult.foodName);
    }

    return { 
      stock: stockResult.stock, 
      stockIds: stockResult.stock?._id ? [stockResult.stock._id] : [],
      auditData: { 
        foodItemId, 
        operationType, 
        quantity: changeQuantity,
        stockId: stockResult.stock?._id
      } 
    };
  }

  async approveWasteTransaction(transaction, approvedBy) {
    if (!transaction.stockData || !transaction.stockData.foodItemId) {
      throw new Error('Waste data missing - food item ID required');
    }

    const { foodItemId, changeQuantity } = transaction.stockData;
    const session = await mongoose.startSession();
    let stockResult;

    try {
      stockResult = await stockService.recordWasteAtomic({
        foodItemId,
        branchId: transaction.branchId,
        quantity: changeQuantity,
        reason: transaction.reason,
        session,
      });
    } finally {
      session.endSession();
    }

    socketEmitter.emitStockUpdated(transaction.branchId.toString(), {
      foodItemId,
      operationType: 'WASTE',
      quantity: changeQuantity,
      remainingQuantity: stockResult.stock?.remainingQuantity,
      status: stockResult.stock?.status,
      fromManualEntry: true,
      manualEntryId: transaction._id,
    });

    if (stockResult.stock?.status === 'SOLD_OUT') {
      socketEmitter.emitFoodSoldOut(transaction.branchId.toString(), foodItemId.toString(), stockResult.foodName);
    }

    return { 
      stock: stockResult.stock, 
      stockIds: stockResult.stock?._id ? [stockResult.stock._id] : [],
      auditData: { 
        foodItemId, 
        quantity: changeQuantity,
        stockId: stockResult.stock?._id
      } 
    };
  }

  async approveExpenseTransaction(transaction, approvedBy) {
    const expenseData = {
      description: transaction.reason,
      amount: transaction.total,
      category: transaction.metadata?.category || 'OTHER',
      source: 'MANUAL',
      transactionDate: transaction.originalTransactionTime,
      offlineTransactionId: transaction._id,
      status: 'RECORDED',
    };

    await OfflineTransaction.findByIdAndUpdate(transaction._id, {
      'metadata.expenseData': expenseData,
    });

    return { 
      expense: expenseData, 
      auditData: { 
        expenseDescription: expenseData.description,
        expenseAmount: expenseData.amount,
        category: expenseData.category
      } 
    };
  }

  /**
   * Get a single manual entry with the applied-result populated (for the
   * Manager/Owner detailed view showing "Applied to System" references).
   */
  async getTransactionById(transactionId) {
    const transaction = await OfflineTransaction.findById(transactionId)
      .populate('enteredBy', 'name role')
      .populate('approvedBy', 'name role')
      .populate('tableId', 'tableNumber');
    if (!transaction) throw new NotFoundError('Offline transaction not found', 'OFFLINE_TX_NOT_FOUND');
    return transaction;
  }

  /**
   * Promote an unfinished DRAFT entry to PENDING so it enters the approval
   * queue. Only the entry's author may submit their own draft.
   */
  async submitTransaction(transactionId, submittedBy) {
    const transaction = await OfflineTransaction.findById(transactionId);
    if (!transaction) throw new NotFoundError('Offline transaction not found', 'OFFLINE_TX_NOT_FOUND');
    if (transaction.status !== 'DRAFT') {
      throw new BadRequestError('Only DRAFT entries can be submitted', 'INVALID_SUBMIT');
    }
    if (transaction.enteredBy.toString() !== submittedBy.toString()) {
      throw new BadRequestError('Only the author can submit a draft entry', 'NOT_OWNER');
    }
    transaction.status = 'PENDING';
    transaction.submittedAt = new Date();
    await transaction.save();

    await auditService.logAction({
      organizationId: transaction.organizationId,
      branchId: transaction.branchId,
      userId: submittedBy,
      action: 'MANUAL_TRANSACTION_SUBMITTED',
      entityType: 'OfflineTransaction',
      entityId: transaction._id,
      oldValue: { status: 'DRAFT' },
      newValue: { status: 'PENDING', operationType: transaction.operationType, reason: transaction.reason },
    });

    return transaction;
  }

  async rejectTransaction(transactionId, rejectedBy, reason) {
    const transaction = await OfflineTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Transaction is not pending');
    }

    transaction.status = 'REJECTED';
    transaction.rejectedBy = new mongoose.Types.ObjectId(rejectedBy);
    transaction.rejectedAt = new Date();
    transaction.rejectionReason = reason;
    await transaction.save();

    await auditService.logAction({
      organizationId: transaction.organizationId,
      branchId: transaction.branchId,
      userId: rejectedBy,
      action: 'MANUAL_TRANSACTION_REJECTED',
      entityType: 'OfflineTransaction',
      entityId: transaction._id,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'REJECTED', reason },
    });

    return transaction;
  }

  async reconcileTransactions(branchId, reconciledBy, options = {}) {
    const { transactionIds, action = 'RECONCILE' } = options;

    let filter = {
      branchId: new mongoose.Types.ObjectId(branchId),
      reconciliationStatus: 'PENDING',
    };

    if (transactionIds && transactionIds.length > 0) {
      filter._id = { $in: transactionIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const transactions = await OfflineTransaction.find(filter);

    for (const tx of transactions) {
      tx.reconciliationStatus = action === 'RECONCILE' ? 'RECONCILED' : 'IGNORED';
      tx.reconciledBy = new mongoose.Types.ObjectId(reconciledBy);
      tx.reconciledAt = new Date();
      await tx.save();

      await auditService.logAction({
        organizationId: tx.organizationId,
        branchId: tx.branchId,
        userId: reconciledBy,
        action: action === 'RECONCILE' ? 'TRANSACTION_RECONCILED' : 'TRANSACTION_IGNORED',
        entityType: 'OfflineTransaction',
        entityId: tx._id,
        oldValue: { reconciliationStatus: 'PENDING' },
        newValue: { reconciliationStatus: action },
      });
    }

    return transactions;
  }

  async getMyEntries(branchId, userId, { page = 1, limit = 20, status = 'active' }) {
    // 'active' = DRAFT + PENDING (things the user still controls or pending
    // approval). Pass a specific status to filter, or 'all' for everything.
    const filter = {
      branchId: new mongoose.Types.ObjectId(branchId),
      enteredBy: new mongoose.Types.ObjectId(userId),
    };
    if (status === 'active') {
      filter.status = { $in: ['DRAFT', 'PENDING'] };
    } else if (status && status !== 'all' && OFFLINE_STATUSES.includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      OfflineTransaction.find(filter)
        .populate('enteredBy', 'name role')
        .populate('tableId', 'tableNumber')
        .sort({ originalTransactionTime: -1 })
        .skip(skip)
        .limit(limit),
      OfflineTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingTransactions(branchId, { page = 1, limit = 20 }) {
    const filter = {
      branchId: new mongoose.Types.ObjectId(branchId),
      status: 'PENDING',
    };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      OfflineTransaction.find(filter)
        .populate('enteredBy', 'name role')
        .populate('tableId', 'tableNumber')
        .sort({ originalTransactionTime: -1 })
        .skip(skip)
        .limit(limit),
      OfflineTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReconciliationQueue(branchId, { page = 1, limit = 50 }) {
    const filter = {
      branchId: new mongoose.Types.ObjectId(branchId),
      reconciliationStatus: 'PENDING',
      status: 'APPROVED',
    };

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      OfflineTransaction.find(filter)
        .populate('enteredBy', 'name role')
        .populate('approvedBy', 'name role')
        .populate('tableId', 'tableNumber')
        .sort({ originalTransactionTime: -1 })
        .skip(skip)
        .limit(limit),
      OfflineTransaction.countDocuments(filter),
    ]);

    const summary = {
      totalAmount: transactions.reduce((sum, tx) => sum + tx.total, 0),
      byPaymentMethod: {},
      bySource: {},
    };

    transactions.forEach(tx => {
      summary.byPaymentMethod[tx.paymentMethod] = (summary.byPaymentMethod[tx.paymentMethod] || 0) + tx.total;
      summary.bySource[tx.source] = (summary.bySource[tx.source] || 0) + tx.total;
    });

    return {
      transactions,
      summary,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOfflineStats(branchId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await OfflineTransaction.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
          reconciledCount: { $sum: { $cond: [{ $eq: ['$reconciliationStatus', 'RECONCILED'] }, 1, 0] } },
          byOutageType: { $push: '$outageType' },
          bySource: { $push: '$source' },
        },
      },
    ]);

    const outageBreakdown = {};
    const sourceBreakdown = {};

    if (stats[0]) {
      stats[0].byOutageType.forEach(type => {
        outageBreakdown[type] = (outageBreakdown[type] || 0) + 1;
      });
      stats[0].bySource.forEach(source => {
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
      });
    }

    return {
      period: { days, startDate: startDate.toISOString() },
      stats: stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        reconciledCount: 0,
      },
      outageBreakdown,
      sourceBreakdown,
    };
  }
}

module.exports = new OfflineTransactionService();