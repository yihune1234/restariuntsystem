const express = require('express');
const router = express.Router();
const offlineTransactionController = require('./offline-transaction.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

router.post(
  '/',
  authenticateStaff,
  requireRoles('MANAGER', 'CASHIER', 'OWNER'),
  offlineTransactionController.createTransaction
);

router.get(
  '/my-entries',
  authenticateStaff,
  requireRoles('MANAGER', 'CASHIER', 'OWNER'),
  offlineTransactionController.getMyEntries
);

router.post(
  '/sync',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.syncBatch
);

router.get(
  '/:branchId/sync-status',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getSyncStatus
);

router.get(
  '/:branchId/problems',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getProblems
);

router.get(
  '/:branchId/pending',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getPendingTransactions
);

router.get(
  '/:branchId/reconciliation',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getReconciliationQueue
);

router.get(
  '/:branchId/stats',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getOfflineStats
);

router.post(
  '/:transactionId/approve',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.approveTransaction
);

// Submit a DRAFT entry for approval (author only).
router.post(
  '/:transactionId/submit',
  authenticateStaff,
  requireRoles('MANAGER', 'CASHIER', 'OWNER'),
  offlineTransactionController.submitTransaction
);

// Get a single manual entry with its applied-result (Manager/Owner audit view).
router.get(
  '/:transactionId',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.getTransactionById
);

router.post(
  '/:transactionId/reject',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.rejectTransaction
);

router.post(
  '/:branchId/reconcile',
  authenticateStaff,
  requireRoles('OWNER'),
  offlineTransactionController.reconcileTransactions
);

router.post(
  '/:id/retry',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.retrySync
);

router.post(
  '/:id/resolve-conflict',
  authenticateStaff,
  requireRoles('MANAGER', 'OWNER'),
  offlineTransactionController.resolveConflict
);

module.exports = router;