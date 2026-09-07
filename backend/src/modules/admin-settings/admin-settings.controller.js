const Restaurant = require('../restaurant/restaurant.model');
const { User } = require('../users/user.model');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

class AdminSettingsController {
  getSettings = asyncHandler(async (req, res) => {
    let restaurant = await Restaurant.findOne({ isActive: true });

    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: 'Faarees Kaafee fi Restoorraantii',
        nameEn: 'Faarees Kaafee fi Restoorraantii',
        nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
        currency: 'ETB',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, 200, 'Settings retrieved successfully', {
      restaurant: restaurant.toJSON(),
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });

  updateBranding = asyncHandler(async (req, res) => {
    const {
      name,
      nameEn,
      nameOm,
      nameAm,
      description,
      descriptionEn,
      descriptionOm,
      descriptionAm,
      logoUrl,
      coverUrl,
      phone,
      address,
      socialMedia,
      currency,
    } = req.body;

    let restaurant = await Restaurant.findOne({ isActive: true });

    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: 'Faarees Kaafee fi Restoorraantii',
        nameEn: 'Faarees Kaafee fi Restoorraantii',
        nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
        currency: 'ETB',
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (nameOm !== undefined) updateData.nameOm = nameOm;
    if (nameAm !== undefined) updateData.nameAm = nameAm;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (descriptionOm !== undefined) updateData.descriptionOm = descriptionOm;
    if (descriptionAm !== undefined) updateData.descriptionAm = descriptionAm;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (currency !== undefined) updateData.currency = currency;
    if (socialMedia !== undefined) {
      updateData.socialMedia = {
        telegram: socialMedia.telegram || '',
        facebook: socialMedia.facebook || '',
        instagram: socialMedia.instagram || '',
      };
    }

    Object.assign(restaurant, updateData);
    await restaurant.save();

    return ApiResponse.success(res, 200, 'Branding updated successfully', {
      restaurant: restaurant.toJSON(),
    });
  });

  updateCredentials = asyncHandler(async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const updateData = {};

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw new BadRequestError('A user with this email already exists', 'EMAIL_EXISTS');
      }
      updateData.email = email.toLowerCase();
    }

    if (newPassword) {
      if (!currentPassword) {
        throw new BadRequestError('Current password is required to set a new password', 'CURRENT_PASSWORD_REQUIRED');
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new BadRequestError('Current password does not match', 'INCORRECT_CURRENT_PASSWORD');
      }

      if (newPassword.length < 6) {
        throw new BadRequestError('New password must be at least 6 characters', 'PASSWORD_TOO_SHORT');
      }

      user.passwordHash = newPassword;
    }

    if (Object.keys(updateData).length > 0) {
      Object.assign(user, updateData);
    }

    await user.save();

    return ApiResponse.success(res, 200, 'Credentials updated successfully');
  });
}

module.exports = new AdminSettingsController();
