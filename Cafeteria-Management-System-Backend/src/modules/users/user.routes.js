const express = require('express');
const userController = require('./user.controller');
const { createUserSchema, updateUserSchema, userIdParamSchema } = require('./user.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const userRouter = express.Router();

userRouter.use(authenticateStaff);

userRouter.get('/', requireRoles('OWNER', 'MANAGER'), userController.getUsers);

userRouter.post('/', validate(createUserSchema), requireRoles('OWNER', 'MANAGER'), userController.createUser);

userRouter.get('/:userId', validate(userIdParamSchema), requireRoles('OWNER', 'MANAGER'), userController.getUserById);

userRouter.patch('/:userId', validate(updateUserSchema), requireRoles('OWNER', 'MANAGER'), userController.updateUser);

userRouter.delete('/:userId', validate(userIdParamSchema), requireRoles('OWNER'), userController.deactivateUser);

module.exports = {
  userRouter,
};
