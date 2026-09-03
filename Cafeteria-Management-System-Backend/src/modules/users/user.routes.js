const express = require('express');
const userController = require('./user.controller');
const { createUserSchema, updateUserSchema, userIdParamSchema } = require('./user.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const userRouter = express.Router();
const branchUserRouter = express.Router({ mergeParams: true });

// All user management routes require staff authentication
userRouter.use(authenticateStaff);
branchUserRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/users:
 *   get:
 *     summary: List all staff users assigned to a branch
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of branch staff
 */
branchUserRouter.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  userController.getUsersByBranch
);

/**
 * @openapi
 * /branches/{branchId}/users:
 *   post:
 *     summary: Create new staff user for a branch (Manager, Cashier, Kitchen, Waiter)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CASHIER, KITCHEN, WAITER]
 *     responses:
 *       201:
 *         description: Staff user created
 */
branchUserRouter.post(
  '/',
  validate(createUserSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  userController.createUser
);

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     summary: Get user details by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 */
userRouter.get(
  '/:userId',
  validate(userIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  userController.getUserById
);

/**
 * @openapi
 * /users/{userId}:
 *   patch:
 *     summary: Update user profile or role
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
userRouter.patch(
  '/:userId',
  validate(updateUserSchema),
  requireRoles('OWNER', 'MANAGER'),
  userController.updateUser
);

/**
 * @openapi
 * /users/{userId}:
 *   delete:
 *     summary: Deactivate staff user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
userRouter.delete(
  '/:userId',
  validate(userIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  userController.deactivateUser
);

module.exports = {
  userRouter,
  branchUserRouter,
};
