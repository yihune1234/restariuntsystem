const { BadRequestError } = require('../utils/errors');

const verifyBranchAccess = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.body.branchId || req.query.branchId;
    if (branchId) {
      return next(new BadRequestError('Branch ID is no longer supported', 'BRANCH_NOT_SUPPORTED'));
    }
    next();
  } catch (error) {
    next(error);
  }
};

const verifyOrganizationAccess = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId || req.body.organizationId;
    if (organizationId) {
      return next(new BadRequestError('Organization ID is no longer supported', 'ORG_NOT_SUPPORTED'));
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyBranchAccess,
  verifyOrganizationAccess,
};
