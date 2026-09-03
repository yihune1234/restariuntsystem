const express = require('express');
const router = express.Router();
const wasteController = require('./waste.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

// Mounted at /branches/:branchId/waste
router.use(authenticateStaff);

// List waste records (Manager/Owner view)
router.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'KITCHEN', 'CASHIER'),
  wasteController.listWaste
);

// Record a new waste entry (any staff)
router.post(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'KITCHEN', 'CASHIER'),
  wasteController.recordWaste
);

// Approve a pending waste record (Manager/Owner)
router.post(
  '/:wasteId/approve',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  wasteController.approveWaste
);

// Reject a pending waste record (Manager/Owner)
router.post(
  '/:wasteId/reject',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  wasteController.rejectWaste
);

module.exports = router;