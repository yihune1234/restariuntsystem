const express = require('express');
const router = express.Router({ mergeParams: true });
const dailyClosingController = require('./daily-closing.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

router.get(
  '/today-metrics',
  authenticateStaff,
  verifyBranchAccess,
  dailyClosingController.getTodayMetrics
);

router.get(
  '/current',
  authenticateStaff,
  verifyBranchAccess,
  dailyClosingController.getOrCreate
);

router.post(
  '/open',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('MANAGER', 'OWNER'),
  dailyClosingController.openDay
);

router.post(
  '/close',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('MANAGER', 'OWNER'),
  dailyClosingController.closeDay
);

router.post(
  '/reconcile',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('OWNER'),
  dailyClosingController.reconcileDay
);

router.get(
  '/history',
  authenticateStaff,
  verifyBranchAccess,
  dailyClosingController.getClosingHistory
);

router.get(
  '/by-date/:date',
  authenticateStaff,
  verifyBranchAccess,
  dailyClosingController.getClosingByDate
);

module.exports = router;