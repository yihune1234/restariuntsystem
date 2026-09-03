const { User } = require('./user.model');
const Branch = require('../branches/branch.model');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../../utils/errors');

class UserService {
  async createUserInBranch({ branchId, organizationId, name, email, phone, password, role, actor }) {
    // Validate branch exists
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    // Only OWNER may create MANAGER accounts; MANAGER may only create
    // operational staff (CASHIER / KITCHEN / WAITER) below their own rank.
    if (role === 'OWNER') {
      throw new ForbiddenError(
        'The organization OWNER account is created at setup time and may not be duplicated',
        'OWNER_CREATION_FORBIDDEN'
      );
    }
    if (actor?.role === 'MANAGER' && role === 'MANAGER') {
      throw new ForbiddenError(
        'A Manager cannot create another Manager account; only the Owner can',
        'ROLE_CREATION_FORBIDDEN'
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists', 'EMAIL_EXISTS');
    }

    const user = await User.create({
      organizationId: organizationId || branch.organizationId,
      branchId: branch._id,
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: password,
      role,
      isActive: true,
    });

    return user;
  }

  async getUsersByBranch(branchId, query = {}) {
    const filter = {
      branchId,
      deletedAt: null,
    };

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;

    const users = await User.find(filter).sort({ name: 1 });
    return users;
  }

  async getUserById(userId, actor) {
    const user = await User.findOne({ _id: userId, deletedAt: null })
      .populate('branchId', 'name code')
      .populate('organizationId', 'name');

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    this.assertCanManageUser(user, actor);

    return user;
  }

  async updateUser(userId, updateData, actor) {
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    this.assertCanManageUser(user, actor);

    const patch = { ...updateData };

    // Only OWNER may change a user's role.
    if (patch.role !== undefined && actor?.role !== 'OWNER') {
      delete patch.role;
    }

    // Never allow granting the OWNER role via update (defense in depth).
    if (patch.role === 'OWNER') {
      delete patch.role;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: patch },
      { new: true, runValidators: true }
    );

    return updatedUser;
  }

  async deactivateUser(userId, actor) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestError('Cannot deactivate the organization OWNER account', 'CANNOT_DEACTIVATE_OWNER');
    }

    this.assertCanManageUser(user, actor);

    // A MANAGER may not deactivate a peer MANAGER.
    if (actor?.role === 'MANAGER' && user.role === 'MANAGER') {
      throw new ForbiddenError(
        'A Manager cannot deactivate another Manager account; only the Owner can',
        'ROLE_DEACTIVATE_FORBIDDEN'
      );
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    return { message: 'User deactivated successfully' };
  }

  /**
   * Enforce that a caller may read/manage a target user.
   * - OWNER: any user within the same organization.
   * - MANAGER: only operational staff (CASHIER / KITCHEN / WAITER) within their
   *   own branch. Cannot access Owner or Manager accounts.
   * - CASHIER / KITCHEN / WAITER: never allowed to manage other users.
   */
  assertCanManageUser(targetUser, actor) {
    if (actor?.role === 'OWNER') {
      const actorOrg = actor.organizationId ? actor.organizationId.toString() : null;
      const targetOrg = targetUser.organizationId ? targetUser.organizationId.toString() : null;
      if (actorOrg && targetOrg && actorOrg !== targetOrg) {
        throw new ForbiddenError('Access denied: user belongs to another organization', 'CROSS_ORGANIZATION_DENIED');
      }
      return;
    }

    if (actor?.role === 'MANAGER') {
      const actorBranch = actor.branchId ? actor.branchId.toString() : null;
      const targetBranch = targetUser.branchId ? targetUser.branchId.toString() : null;
      if (actorBranch && targetBranch && actorBranch !== targetBranch) {
        throw new ForbiddenError('Access denied: user belongs to another branch', 'BRANCH_ISOLATION_VIOLATION');
      }
      if (['OWNER', 'MANAGER'].includes(targetUser.role)) {
        throw new ForbiddenError(
          'A Manager cannot access Owner or Manager accounts',
          'ROLE_MANAGE_FORBIDDEN'
        );
      }
      return;
    }

    // CASHIER, KITCHEN and WAITER cannot manage user accounts at all.
    throw new ForbiddenError(
      'Your role does not have permission to manage user accounts',
      'ROLE_MANAGE_FORBIDDEN'
    );
  }
}

module.exports = new UserService();
