const express = require('express');
const router = express.Router({ mergeParams: true });
const fraudDetectionController = require('./fraud-detection.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

router.get(
  '/summary',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  fraudDetectionController.getFraudSummary
);

router.get(
  '/warnings',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  fraudDetectionController.getDetailedWarnings
);

module.exports = router;