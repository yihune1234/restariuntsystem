const express = require('express');
const reportController = require('./report.controller');
const { branchReportSchema, orgReportSchema } = require('./report.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const {
  verifyBranchAccess,
  verifyOrganizationAccess,
} = require('../../middleware/branch.middleware');

const branchReportRouter = express.Router({ mergeParams: true });
const orgReportRouter = express.Router({ mergeParams: true });

branchReportRouter.use(authenticateStaff);
orgReportRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/reports/sales:
 *   get:
 *     summary: Sales, revenue, tax, and order totals report
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sales report data
 */
branchReportRouter.get(
  '/sales',
  validate(branchReportSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getSalesReport
);

/**
 * @openapi
 * /branches/{branchId}/reports/orders:
 *   get:
 *     summary: Orders by status and order source breakdown
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders volume report data
 */
branchReportRouter.get(
  '/orders',
  validate(branchReportSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getOrdersReport
);

/**
 * @openapi
 * /branches/{branchId}/reports/payments:
 *   get:
 *     summary: Payments breakdown by provider (Chapa vs Cashier)
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment distribution report
 */
branchReportRouter.get(
  '/payments',
  validate(branchReportSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  reportController.getPaymentsReport
);

/**
 * @openapi
 * /branches/{branchId}/reports/food:
 *   get:
 *     summary: Top-selling foods, item revenue, and stock overview
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food sales analytics
 */
branchReportRouter.get(
  '/food',
  validate(branchReportSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getFoodReport
);

/**
 * @openapi
 * /branches/{branchId}/reports/operations:
 *   get:
 *     summary: Kitchen preparation time & waiter delivery velocity
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Operational efficiency analytics
 */
branchReportRouter.get(
  '/operations',
  validate(branchReportSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getOperationsReport
);

/**
 * @openapi
 * /organizations/{organizationId}/reports/overview:
 *   get:
 *     summary: Organization executive sales overview across all branches
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Multi-branch executive report
 */
orgReportRouter.get(
  '/overview',
  validate(orgReportSchema),
  verifyOrganizationAccess,
  requireRoles('OWNER'),
  reportController.getOrgOverview
);

orgReportRouter.get(
  '/owner-dashboard',
  validate(orgReportSchema),
  verifyOrganizationAccess,
  requireRoles('OWNER'),
  reportController.getOwnerDashboardKPIs
);

branchReportRouter.get(
  '/hourly-sales',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getHourlySalesAnalysis
);

branchReportRouter.get(
  '/inventory',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  reportController.getBranchInventoryReport
);

orgReportRouter.get(
  '/inventory-overview',
  verifyOrganizationAccess,
  requireRoles('OWNER'),
  reportController.getOrgInventoryOverview
);

orgReportRouter.get(
  '/comparison',
  verifyOrganizationAccess,
  requireRoles('OWNER'),
  reportController.getBranchComparisonReport
);

module.exports = {
  branchReportRouter,
  orgReportRouter,
};
