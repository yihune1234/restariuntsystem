const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../users/user.model');
const RefreshToken = require('./refresh-token.model');
const config = require('../../config/env');
const { UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../config/logger');

class AuthService {
  generateAccessToken(user) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
  }

  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  getRefreshTokenExpiry() {
    const days = parseInt(config.jwt.refreshExpiresIn, 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  async login({ email, password, ipAddress = '', userAgent = '' }) {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+passwordHash');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = this.generateAccessToken(user);
    const refreshTokenString = this.generateRefreshToken();
    const expiresAt = this.getRefreshTokenExpiry();

    await RefreshToken.create({
      userId: user._id,
      token: refreshTokenString,
      expiresAt,
      ipAddress,
      userAgent,
    });

    const userObj = user.toJSON();

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
      },
    };
  }

  async refresh({ refreshToken, ipAddress = '', userAgent = '' }) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (storedToken.isRevoked) {
      await RefreshToken.updateMany({ userId: storedToken.userId }, { isRevoked: true });
      logger.warn(`Security alert: Revoked refresh token reused by user: ${storedToken.userId}`);
      throw new UnauthorizedError('Revoked token reuse detected. Please log in again.', 'TOKEN_REVOKED');
    }

    if (new Date() > storedToken.expiresAt) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token has expired. Please log in again.', 'TOKEN_EXPIRED');
    }

    const user = await User.findOne({ _id: storedToken.userId, isActive: true });
    if (!user) {
      throw new UnauthorizedError('User account not found or deactivated', 'USER_NOT_FOUND');
    }

    storedToken.isRevoked = true;
    await storedToken.save();

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshTokenString = this.generateRefreshToken();
    const expiresAt = this.getRefreshTokenExpiry();

    await RefreshToken.create({
      userId: user._id,
      token: newRefreshTokenString,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenString,
    };
  }

  async logout({ refreshToken }) {
    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true });
    }
    return { success: true };
  }

  async getMe(userId) {
    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      throw new NotFoundError('User profile not found or inactive', 'USER_NOT_FOUND');
    }

    return user.toJSON();
  }

  async updateOwnProfile(userId, updateData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const allowedFields = ['name', 'phone'];
    const patch = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        patch[field] = updateData[field];
      }
    }

    if (updateData.email && updateData.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: updateData.email.toLowerCase() });
      if (existing) {
        throw new BadRequestError('A user with this email already exists', 'EMAIL_EXISTS');
      }
      patch.email = updateData.email.toLowerCase();
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: patch },
      { new: true, runValidators: true }
    );

    return updated;
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match', 'INCORRECT_CURRENT_PASSWORD');
    }

    user.passwordHash = newPassword;
    await user.save();

    await RefreshToken.updateMany({ userId }, { isRevoked: true });

    return { message: 'Password updated successfully. Please log in with your new password.' };
  }

  async adminResetPassword({ targetUserId, newPassword, actor }) {
    if (actor.role !== 'OWNER') {
      throw new ForbiddenError('Only the Owner can reset another user\'s password', 'ADMIN_RESET_FORBIDDEN');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found', 'USER_NOT_FOUND');
    }

    if (targetUser._id.toString() === actor.id) {
      throw new BadRequestError('To change your own password, use the Change Password feature with your current password', 'USE_CHANGE_PASSWORD');
    }

    if (targetUser.role === 'OWNER') {
      throw new ForbiddenError('Cannot reset the OWNER account password', 'OWNER_RESET_FORBIDDEN');
    }

    targetUser.passwordHash = newPassword;
    await targetUser.save();

    await RefreshToken.updateMany({ userId: targetUserId }, { isRevoked: true });

    logger.info(`Owner ${actor.id} reset password for user ${targetUserId} (${targetUser.role})`);

    return {
      message: `Password reset successfully for ${targetUser.name}. They will need to log in with the new password.`,
    };
  }
}

module.exports = new AuthService();
