const express = require('express');
const router = express.Router();
const organizationSettingsController = require('./organization-settings.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyOrganizationAccess } = require('../../middleware/branch.middleware');

router.get(
  '/',
  authenticateStaff,
  requireRoles('OWNER'),
  verifyOrganizationAccess,
  organizationSettingsController.getSettings
);

router.patch(
  '/',
  authenticateStaff,
  requireRoles('OWNER'),
  verifyOrganizationAccess,
  organizationSettingsController.updateSettings
);

router.post(
  '/reset',
  authenticateStaff,
  requireRoles('OWNER'),
  verifyOrganizationAccess,
  organizationSettingsController.resetSettings
);

router.get(
  '/payment-methods',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  organizationSettingsController.getPaymentMethods
);

router.get(
  '/validate/discount',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  organizationSettingsController.validateDiscount
);

router.get(
  '/validate/refund',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  organizationSettingsController.validateRefund
);

router.get(
  '/validate/cancellation',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  organizationSettingsController.validateCancellation
);

module.exports = router;