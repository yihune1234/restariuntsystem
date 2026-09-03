const userService = require('./user.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class UserController {
  createUser = asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;
    const { branchId } = req.params;

    const user = await userService.createUserInBranch({
      branchId,
      organizationId: req.user.organizationId,
      name,
      email,
      phone,
      password,
      role,
      actor: req.user,
    });

    return ApiResponse.created(res, 'Staff user created successfully', user);
  });

  getUsersByBranch = asyncHandler(async (req, res) => {
    const users = await userService.getUsersByBranch(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch staff retrieved successfully', users);
  });

  getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.userId, req.user);
    return ApiResponse.success(res, 200, 'User retrieved successfully', user);
  });

  updateUser = asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.userId, req.body, req.user);
    return ApiResponse.success(res, 200, 'User updated successfully', user);
  });

  deactivateUser = asyncHandler(async (req, res) => {
    const result = await userService.deactivateUser(req.params.userId, req.user);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new UserController();
