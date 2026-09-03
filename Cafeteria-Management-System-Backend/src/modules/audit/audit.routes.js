const express = require('express');
const auditController = require('./audit.controller');
const { getAuditLogsSchema } = require('./audit.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const branchAuditRouter = express.Router({ mergeParams: true });

branchAuditRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/audit-logs:
 *   get:
 *     summary: View immutable compliance audit trail for a branch (Manager/Owner)
 *     tags:
 *       - Audit Logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
branchAuditRouter.get(
  '/',
  validate(getAuditLogsSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  auditController.getBranchAuditLogs
);

module.exports = {
  branchAuditRouter,
};
