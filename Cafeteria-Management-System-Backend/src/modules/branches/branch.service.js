const crypto = require('crypto');
const Branch = require('./branch.model');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class BranchService {
  generateBranchQrToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Public listing of all active branches. Returns the minimal fields
   * needed to power a marketing / view-only landing page (name, code,
   * address, phone, hours). No organization, financial, or staff data
   * is exposed.
   */
  async listPublicBranches() {
    const branches = await Branch.find(
      { isActive: true, deletedAt: null },
      {
        name: 1,
        code: 1,
        address: 1,
        phone: 1,
        'settings.openTime': 1,
        'settings.closeTime': 1,
        'settings.currency': 1,
        organizationId: 1,
      }
    ).sort({ name: 1 }).lean();
    return branches;
  }

  async getBranchById(branchId) {
    const branch = await Branch.findOne({
      _id: branchId,
      deletedAt: null,
    }).populate('organizationId', 'name currency defaultTaxRate');

    if (!branch) {
      throw new NotFoundError('Branch not found or has been removed', 'BRANCH_NOT_FOUND');
    }

    return branch;
  }

  async updateBranch(branchId, updateData) {
    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    return branch;
  }

  /**
   * Generate or regenerate the general branch QR token
   */
  async generateBranchQr(branchId) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const newQrToken = this.generateBranchQrToken();
    branch.branchQrToken = newQrToken;
    await branch.save();

    return {
      branchQrToken: newQrToken,
      qrUrl: `/customer/qr/${branch._id}?t=${newQrToken}`,
    };
  }

  /**
   * Soft delete branch (sets isActive = false, deletedAt = Date)
   */
  async deleteBranch(branchId) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });

    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    branch.isActive = false;
    branch.deletedAt = new Date();
    await branch.save();

    return { message: 'Branch deactivated and soft-deleted successfully' };
  }
}

module.exports = new BranchService();
