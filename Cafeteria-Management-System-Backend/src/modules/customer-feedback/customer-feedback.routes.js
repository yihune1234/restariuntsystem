const express = require('express');
const router = express.Router();
const customerFeedbackController = require('./customer-feedback.controller');
const { authenticateAny, authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { standardLimiter } = require('../../middleware/rate-limit.middleware');

// Feedback submission is public - customers can submit feedback after order
// without authentication. Rate limiting still applies to prevent spam.
router.post(
  '/',
  standardLimiter,
  customerFeedbackController.submitFeedback
);

router.get(
  '/organization/:organizationId',
  authenticateStaff,
  requireRoles('OWNER'),
  customerFeedbackController.getOrganizationFeedback
);

/** OWNER analytics: averages, positive/negative %, ideas, complaint stats, trend. */
router.get(
  '/organization/:organizationId/analytics',
  authenticateStaff,
  requireRoles('OWNER'),
  customerFeedbackController.getOrganizationAnalytics
);

router.get(
  '/:branchId',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  customerFeedbackController.getBranchFeedback
);

router.get(
  '/:branchId/stats',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  customerFeedbackController.getFeedbackStats
);

router.patch(
  '/:feedbackId/resolve',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  customerFeedbackController.resolveFeedback
);

router.patch(
  '/:feedbackId/status',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  customerFeedbackController.updateFeedbackStatus
);

module.exports = router;