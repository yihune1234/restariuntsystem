const express = require('express');
const organizationController = require('./organization.controller');
const { updateOrgSchema, createBranchUnderOrgSchema } = require('./organization.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyOrganizationAccess } = require('../../middleware/branch.middleware');

const router = express.Router();

// All organization endpoints require staff authentication and OWNER role
router.use(authenticateStaff, requireRoles('OWNER'));

/**
 * @openapi
 * /organizations/{organizationId}:
 *   get:
 *     summary: Get organization details
 *     tags:
 *       - Organizations
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
 *         description: Organization details retrieved
 */
router.get('/:organizationId', verifyOrganizationAccess, organizationController.getOrganization);

/**
 * @openapi
 * /organizations/{organizationId}:
 *   patch:
 *     summary: Update organization details & settings
 *     tags:
 *       - Organizations
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
 *         description: Organization updated
 */
router.patch(
  '/:organizationId',
  verifyOrganizationAccess,
  validate(updateOrgSchema),
  organizationController.updateOrganization
);

/**
 * @openapi
 * /organizations/{organizationId}/branches:
 *   get:
 *     summary: Get all branches in organization
 *     tags:
 *       - Organizations
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
 *         description: List of branches
 */
router.get('/:organizationId/branches', verifyOrganizationAccess, organizationController.getBranches);

/**
 * @openapi
 * /organizations/{organizationId}/branches:
 *   post:
 *     summary: Create a new branch under organization
 *     tags:
 *       - Organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Branch created
 */
router.post(
  '/:organizationId/branches',
  verifyOrganizationAccess,
  validate(createBranchUnderOrgSchema),
  organizationController.createBranch
);

module.exports = router;
