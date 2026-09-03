const express = require('express');
const branchController = require('./branch.controller');
const { branchIdParamSchema, updateBranchSchema } = require('./branch.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const router = express.Router();

// Base middleware for all /branches endpoints
router.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}:
 *   get:
 *     summary: Get branch details
 *     tags:
 *       - Branches
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
 *         description: Branch details
 */
router.get(
  '/:branchId',
  validate(branchIdParamSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'),
  branchController.getBranch
);

/**
 * @openapi
 * /branches/{branchId}:
 *   patch:
 *     summary: Update branch details (Owner or Manager)
 *     tags:
 *       - Branches
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
 *         description: Branch updated
 */
router.patch(
  '/:branchId',
  validate(updateBranchSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  branchController.updateBranch
);

/**
 * @openapi
 * /branches/{branchId}:
 *   delete:
 *     summary: Soft delete branch (Owner only)
 *     tags:
 *       - Branches
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
 *         description: Branch soft-deleted
 */
router.delete(
  '/:branchId',
  validate(branchIdParamSchema),
  verifyBranchAccess,
  requireRoles('OWNER'),
  branchController.deleteBranch
);

/**
 * @openapi
 * /branches/{branchId}/generate-qr:
 *   post:
 *     summary: Generate or regenerate general branch QR code
 *     tags:
 *       - Branches
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
 *         description: Branch QR code generated
 */
router.post(
  '/:branchId/generate-qr',
  validate(branchIdParamSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  branchController.generateBranchQr
);

module.exports = router;
