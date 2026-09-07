const logger = require('./logger');

function getDefaultOrganizationId() {
  return null;
}

function getDefaultBranchId() {
  return null;
}

async function getDefaults() {
  return { organizationId: null, branchId: null };
}

function clearCache() {}

module.exports = {
  getDefaultOrganizationId,
  getDefaultBranchId,
  getDefaults,
  clearCache,
};
