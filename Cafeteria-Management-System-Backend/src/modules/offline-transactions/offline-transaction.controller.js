const offlineTransactionService = require('./offline-transaction.service');
const offlineSyncService = require('./offline-sync.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class OfflineTransactionController {
  createTransaction = asyncHandler(async (req, res) => {
    const { organizationId, branchId, id: userId } = req.user;
    const transaction = await offlineTransactionService.createOfflineTransaction({
      ...req.body,
      organizationId,
      branchId,
      enteredBy: userId,
    });
    return ApiResponse.success(res, 201, 'Offline transaction created', transaction);
  });

  getMyEntries = asyncHandler(async (req, res) => {
    const { branchId, id: userId } = req.user;
    const { page, limit, status } = req.query;

    const result = await offlineTransactionService.getMyEntries(branchId, userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status: status || 'active',
    });
    return ApiResponse.success(res, 200, 'My entries retrieved', result);
  });

  approveTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { id: userId } = req.user;

    const result = await offlineTransactionService.approveTransaction(transactionId, userId);
    return ApiResponse.success(res, 200, 'Transaction approved and order created', result);
  });

  rejectTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { id: userId } = req.user;
    const { reason } = req.body;

    const transaction = await offlineTransactionService.rejectTransaction(transactionId, userId, reason);
    return ApiResponse.success(res, 200, 'Transaction rejected', transaction);
  });

  reconcileTransactions = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { id: userId } = req.user;
    const { transactionIds, action } = req.body;

    const transactions = await offlineTransactionService.reconcileTransactions(
      branchId,
      userId,
      { transactionIds, action }
    );
    return ApiResponse.success(res, 200, `Reconciled ${transactions.length} transactions`, transactions);
  });

  getPendingTransactions = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { page, limit } = req.query;

    const result = await offlineTransactionService.getPendingTransactions(branchId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return ApiResponse.success(res, 200, 'Pending transactions retrieved', result);
  });

  getTransactionById = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const transaction = await offlineTransactionService.getTransactionById(transactionId);
    return ApiResponse.success(res, 200, 'Transaction retrieved', transaction);
  });

  submitTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { id: userId } = req.user;
    const transaction = await offlineTransactionService.submitTransaction(transactionId, userId);
    return ApiResponse.success(res, 200, 'Draft submitted for approval', transaction);
  });

  getReconciliationQueue = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { page, limit } = req.query;

    const result = await offlineTransactionService.getReconciliationQueue(branchId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    return ApiResponse.success(res, 200, 'Reconciliation queue retrieved', result);
  });

  getOfflineStats = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { days } = req.query;

    const stats = await offlineTransactionService.getOfflineStats(branchId, parseInt(days) || 7);
    return ApiResponse.success(res, 200, 'Offline statistics retrieved', stats);
  });

  syncBatch = asyncHandler(async (req, res) => {
    const { organizationId, branchId, id: userId } = req.user;
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return ApiResponse.error(res, 400, 'Records array is required', 'VALIDATION_ERROR');
    }

    if (records.length > 100) {
      return ApiResponse.error(res, 400, 'Maximum 100 records per batch', 'VALIDATION_ERROR');
    }

    for (const record of records) {
      if (!record.clientRefId) {
        return ApiResponse.error(res, 400, 'Each record must have a clientRefId', 'VALIDATION_ERROR');
      }
      if (!record.operationType) {
        return ApiResponse.error(res, 400, 'Each record must have an operationType', 'VALIDATION_ERROR');
      }
    }

    const result = await offlineSyncService.syncBatch(records, userId, branchId);
    return ApiResponse.success(res, 200, 'Batch sync completed', result);
  });

  getSyncStatus = asyncHandler(async (req, res) => {
    const { branchId } = req.params;

    const status = await offlineSyncService.getSyncStatus(branchId);
    return ApiResponse.success(res, 200, 'Sync status retrieved', status);
  });

  getProblems = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { page, limit } = req.query;

    const result = await offlineSyncService.getProblemRecords(branchId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return ApiResponse.success(res, 200, 'Problem records retrieved', result);
  });

  retrySync = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const record = await offlineTransactionService.retrySync(id);
    return ApiResponse.success(res, 200, 'Record reset to PENDING_SYNC', record);
  });

  resolveConflict = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { useOffline } = req.body;

    if (typeof useOffline !== 'boolean') {
      return ApiResponse.error(res, 400, 'useOffline boolean is required', 'VALIDATION_ERROR');
    }

    const record = await offlineTransactionService.resolveConflict(id, { useOffline });
    return ApiResponse.success(res, 200, 'Conflict resolved', record);
  });
}

module.exports = new OfflineTransactionController();