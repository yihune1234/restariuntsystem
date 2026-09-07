const authService = require('./auth.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class AuthController {
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.login({ email, password, ipAddress, userAgent });

    return ApiResponse.success(res, 200, 'Login successful', result);
  });

  refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.refresh({ refreshToken, ipAddress, userAgent });

    return ApiResponse.success(res, 200, 'Token refreshed successfully', result);
  });

  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout({ refreshToken });

    return ApiResponse.success(res, 200, 'Logout successful');
  });

  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return ApiResponse.success(res, 200, 'User profile retrieved successfully', user);
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
    });

    return ApiResponse.success(res, 200, result.message);
  });

  updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, 200, 'Profile updated successfully', user);
  });

  adminResetPassword = asyncHandler(async (req, res) => {
    const { targetUserId, newPassword } = req.body;
    const result = await authService.adminResetPassword({
      targetUserId,
      newPassword,
      actor: req.user,
    });

    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new AuthController();
