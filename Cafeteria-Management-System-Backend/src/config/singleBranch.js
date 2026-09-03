const config = require('./env');
const logger = require('./logger');
const Organization = require('../modules/organizations/organization.model');
const Branch = require('../modules/branches/branch.model');

/**
 * Single-Branch Mode Configuration
 *
 * This module resolves the default organization and branch IDs for the system.
 * In single-branch mode, all operations default to these IDs, removing the need
 * for users to explicitly provide organization or branch context.
 *
 * The architecture preserves the data model for future multi-branch support.
 * To re-enable multi-branch, simply remove the auto-resolution logic and
 * re-expose organization/branch selection in the frontend.
 */

let _cachedOrgId = null;
let _cachedBranchId = null;

/**
 * Resolve the default organization ID.
 * Priority: env var > database lookup (first active org)
 */
async function getDefaultOrganizationId() {
  if (_cachedOrgId) return _cachedOrgId;

  if (config.defaultOrganizationId) {
    _cachedOrgId = config.defaultOrganizationId;
    return _cachedOrgId;
  }

  // Auto-resolve from database: find the first active organization
  const org = await Organization.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (org) {
    _cachedOrgId = org._id.toString();
    logger.info(`[SingleBranch] Auto-resolved default organization: ${_cachedOrgId}`);
    return _cachedOrgId;
  }

  logger.warn('[SingleBranch] No active organization found in database');
  return null;
}

/**
 * Resolve the default branch ID.
 * Priority: env var > database lookup (first active branch)
 */
async function getDefaultBranchId() {
  if (_cachedBranchId) return _cachedBranchId;

  if (config.defaultBranchId) {
    _cachedBranchId = config.defaultBranchId;
    return _cachedBranchId;
  }

  // Auto-resolve from database: find the first active branch
  const branch = await Branch.findOne({ isActive: true, deletedAt: null }).sort({ createdAt: 1 });
  if (branch) {
    _cachedBranchId = branch._id.toString();
    logger.info(`[SingleBranch] Auto-resolved default branch: ${_cachedBranchId}`);
    return _cachedBranchId;
  }

  logger.warn('[SingleBranch] No active branch found in database');
  return null;
}

/**
 * Get both default IDs in a single call
 */
async function getDefaults() {
  const [organizationId, branchId] = await Promise.all([
    getDefaultOrganizationId(),
    getDefaultBranchId(),
  ]);
  return { organizationId, branchId };
}

/**
 * Clear cached defaults (useful after seed or admin changes)
 */
function clearCache() {
  _cachedOrgId = null;
  _cachedBranchId = null;
}

module.exports = {
  getDefaultOrganizationId,
  getDefaultBranchId,
  getDefaults,
  clearCache,
};
