const Organization = require('./organization.model');
const Branch = require('../branches/branch.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

class OrganizationService {
  async getOrganizationById(organizationId) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found', 'ORGANIZATION_NOT_FOUND');
    }
    return org;
  }

  async updateOrganization(organizationId, updateData) {
    if (updateData.name) {
      const existing = await Organization.findOne({
        name: updateData.name,
        _id: { $ne: organizationId },
      });
      if (existing) {
        throw new ConflictError('An organization with this name already exists', 'ORG_NAME_EXISTS');
      }
    }

    const org = await Organization.findByIdAndUpdate(organizationId, { $set: updateData }, { new: true, runValidators: true });

    if (!org) {
      throw new NotFoundError('Organization not found', 'ORGANIZATION_NOT_FOUND');
    }

    return org;
  }

  async getBranchesByOrganization(organizationId) {
    const branches = await Branch.find({
      organizationId,
      deletedAt: null,
    }).sort({ createdAt: 1 });

    return branches;
  }

  async createBranch(organizationId, branchData) {
    const org = await this.getOrganizationById(organizationId);

    const existingCode = await Branch.findOne({
      organizationId,
      code: branchData.code.toUpperCase(),
    });

    if (existingCode) {
      throw new ConflictError(`Branch code '${branchData.code}' already exists in this organization`, 'BRANCH_CODE_EXISTS');
    }

    const branch = await Branch.create({
      organizationId: org._id,
      ...branchData,
      code: branchData.code.toUpperCase(),
    });

    return branch;
  }
}

module.exports = new OrganizationService();
