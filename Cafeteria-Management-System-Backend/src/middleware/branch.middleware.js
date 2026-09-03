const mongoose = require('mongoose');
const Branch = require('../modules/branches/branch.model');
const Organization = require('../modules/organizations/organization.model');
const { getDefaultOrganizationId, getDefaultBranchId } = require('../config/singleBranch');
const { ForbiddenError, NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Middleware to enforce branch isolation
 * - For OWNER: Can access any branch belonging to their organization
 * - For MANAGER / CASHIER / KITCHEN / WAITER: Can only access their assigned branch
 *
 * In single-branch mode, if no branchId is provided, the default branch is auto-resolved.
 */
const verifyBranchAccess = async (req, res, next) => {
  try {
    let branchId = req.params.branchId || req.body.branchId || req.query.branchId || req.headers['x-branch-id'];

    // Single-branch mode: auto-resolve to default branch if not provided
    if (!branchId) {
      branchId = await getDefaultBranchId();
      if (branchId) {
        // Inject the resolved branchId into the request for downstream use
        if (!req.params.branchId) req.params.branchId = branchId;
        if (!req.body.branchId) req.body.branchId = branchId;
        if (!req.query.branchId) req.query.branchId = branchId;
      }
    }

    if (!branchId) {
      return next(new BadRequestError('Branch ID parameter or header is required', 'MISSING_BRANCH_ID'));
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return next(new BadRequestError('Invalid branch ID format', 'INVALID_BRANCH_ID'));
    }

    const branch = await Branch.findOne({
      _id: branchId,
      isActive: true,
      deletedAt: null,
    });

    if (!branch) {
      return next(new NotFoundError('Branch not found or inactive', 'BRANCH_NOT_FOUND'));
    }

    // When a staff user is logged in, verify permissions
    if (req.user) {
      if (req.user.role === 'OWNER') {
        // In single-branch/multi-org setups the OWNER must belong to the same
        // organization as the branch. Guard against missing references on
        // legacy/incomplete data rather than throwing a TypeError.
        if (
          branch.organizationId &&
          req.user.organizationId &&
          branch.organizationId.toString() !== req.user.organizationId.toString()
        ) {
          return next(
            new ForbiddenError('Access denied: You do not own this restaurant branch', 'BRANCH_ACCESS_DENIED')
          );
        }
      } else {
        // Staff belongs to one branch
        if (branch._id && (!req.user.branchId || req.user.branchId.toString() !== branch._id.toString())) {
          return next(
            new ForbiddenError('Access denied: You are not authorized to access another branch data', 'BRANCH_ISOLATION_VIOLATION')
          );
        }
      }
    }

    req.branch = branch;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify organization ownership (For OWNER role)
 *
 * In single-branch mode, if no organizationId is provided, the default organization is auto-resolved.
 */
const verifyOrganizationAccess = async (req, res, next) => {
  try {
    let organizationId = req.params.organizationId || req.body.organizationId || req.user?.organizationId;

    // Single-branch mode: auto-resolve to default organization if not provided
    if (!organizationId) {
      organizationId = await getDefaultOrganizationId();
      if (organizationId) {
        if (!req.params.organizationId) req.params.organizationId = organizationId;
      }
    }

    if (!organizationId) {
      return next(new BadRequestError('Organization ID is required', 'MISSING_ORGANIZATION_ID'));
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return next(new BadRequestError('Invalid organization ID format', 'INVALID_ORGANIZATION_ID'));
    }

    const org = await Organization.findOne({
      _id: organizationId,
      isActive: true,
    });

    if (!org) {
      return next(new NotFoundError('Organization not found or inactive', 'ORGANIZATION_NOT_FOUND'));
    }

    if (req.user && req.user.organizationId && req.user.organizationId.toString() !== org._id.toString()) {
      return next(new ForbiddenError('Access denied: You do not belong to this organization', 'ORGANIZATION_ACCESS_DENIED'));
    }

    req.organization = org;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyBranchAccess,
  verifyOrganizationAccess,
};
