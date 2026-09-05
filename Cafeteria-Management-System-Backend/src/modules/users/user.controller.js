const userService = require('./user.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class UserController {
  createUser = asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    const user = await userService.createUser({
      name,
      email,
      phone,
      password,
      role,
    });
    return ApiResponse.created(res, 'Staff user created successfully', user);
  });

  getUsers = asyncHandler(async (req, res) => {
    const users = await userService.getUsers();
    return ApiResponse.success(res, 200, 'Staff retrieved successfully', users);
  });

  getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.userId);
    return ApiResponse.success(res, 200, 'User retrieved successfully', user);
  });

  updateUser = asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.userId, req.body);
    return ApiResponse.success(res, 200, 'User updated successfully', user);
  });

  deactivateUser = asyncHandler(async (req, res) => {
    const result = await userService.deactivateUser(req.params.userId);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new UserController();
