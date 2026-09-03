const express = require('express');
const router = express.Router();
const refundController = require('./refund.controller');
const { requestRefundSchema, refundIdParamSchema, rejectRefundSchema, listRefundsSchema } = require('./refund.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

// Request a refund (Cashier can request, Manager/Owner can request + approve)
router.post(
  '/',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  validate(requestRefundSchema),
  refundController.requestRefund
);

// List refunds (Manager sees branch, Owner sees org)
router.get(
  '/',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  validate(listRefundsSchema),
  refundController.listRefunds
);

// Refund stats
router.get(
  '/stats/:branchId',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  refundController.getRefundStats
);

// Refundable payments for an order
router.get(
  '/order/:orderId/payments',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  refundController.getRefundablePayments
);

// Get single refund
router.get(
  '/:refundId',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  validate(refundIdParamSchema),
  refundController.getRefund
);

// Approve refund (Manager/Owner)
router.post(
  '/:refundId/approve',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  validate(refundIdParamSchema),
  refundController.approveRefund
);

// Reject refund (Manager/Owner)
router.post(
  '/:refundId/reject',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  validate(rejectRefundSchema),
  refundController.rejectRefund
);

// Process refund (Manager/Owner)
router.post(
  '/:refundId/process',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  validate(refundIdParamSchema),
  refundController.processRefund
);

module.exports = router;
