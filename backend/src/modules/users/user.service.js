const { User, USER_ROLES } = require('./user.model');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../../utils/errors');

class UserService {
  async createUser({ name, email, phone, password, role }) {
    if (role === 'OWNER') {
      throw new ForbiddenError('The Owner account is created at setup time and may not be duplicated', 'OWNER_CREATION_FORBIDDEN');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists', 'EMAIL_EXISTS');
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: password,
      role,
      isActive: true,
    });

    return user;
  }

  async getUsers(query = {}) {
    const filter = {
      deletedAt: null,
    };

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;

    const users = await User.find(filter).sort({ name: 1 });
    return users;
  }

  async getUserById(userId) {
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  async updateUser(userId, updateData) {
    const user = await User.findOne({ _id: userId, deletedAt: null });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const patch = { ...updateData };

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

  async deactivateUser(userId) {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestError('Cannot deactivate the Owner account', 'CANNOT_DEACTIVATE_OWNER');
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    return { message: 'User deactivated successfully' };
  }
}

module.exports = new UserService();
