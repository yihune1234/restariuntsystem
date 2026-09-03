/**
 * Single-Branch Mode Configuration (Frontend)
 *
 * This module provides the default organization and branch IDs for the system.
 * In single-branch mode, all frontend stores use these defaults, removing the
 * need for users to explicitly select an organization or branch.
 *
 * The architecture preserves the data model for future multi-branch support.
 * To re-enable multi-branch, simply remove the auto-resolution logic and
 * re-expose organization/branch selection in the frontend.
 */

const STORAGE_KEYS = {
  organizationId: 'ts_default_organization_id',
  branchId: 'ts_default_branch_id',
};

/**
 * Get the default organization ID from the auth user or localStorage
 */
export function getDefaultOrganizationId(authUser) {
  // Priority: authUser > localStorage
  const fromUser = authUser?.organizationId;
  if (fromUser) return typeof fromUser === 'object' ? fromUser?._id : fromUser;

  const fromStorage = localStorage.getItem(STORAGE_KEYS.organizationId);
  if (fromStorage) return fromStorage;

  return null;
}

/**
 * Get the default branch ID from the auth user or localStorage
 */
export function getDefaultBranchId(authUser) {
  const fromUser = authUser?.branchId;
  if (fromUser) return typeof fromUser === 'object' ? fromUser?._id : fromUser;

  const fromStorage = localStorage.getItem(STORAGE_KEYS.branchId);
  if (fromStorage) return fromStorage;

  return null;
}

/**
 * Set default IDs in localStorage (called after login/auth check)
 */
export function setDefaultIds(organizationId, branchId) {
  if (organizationId) localStorage.setItem(STORAGE_KEYS.organizationId, organizationId);
  if (branchId) localStorage.setItem(STORAGE_KEYS.branchId, branchId);
}

/**
 * Clear default IDs from localStorage (called on logout)
 */
export function clearDefaultIds() {
  localStorage.removeItem(STORAGE_KEYS.organizationId);
  localStorage.removeItem(STORAGE_KEYS.branchId);
}

export default {
  getDefaultOrganizationId,
  getDefaultBranchId,
  setDefaultIds,
  clearDefaultIds,
};
