const express = require('express');
const authController = require('./auth.controller');
const { loginSchema, refreshSchema, changePasswordSchema, updateProfileSchema, adminResetPasswordSchema } = require('./auth.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rate-limit.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const router = express.Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Staff login (Owner, Manager, Cashier, Kitchen, Waiter)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@restaurant.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful with access and refresh tokens
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh expired access token using refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access and refresh tokens issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged out
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get authenticated staff profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', authenticateStaff, authController.getMe);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change staff password
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Current password mismatch
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/change-password', authenticateStaff, validate(changePasswordSchema), authController.changePassword);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     summary: Update authenticated user's own profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/profile', authenticateStaff, validate(updateProfileSchema), authController.updateProfile);

/**
 * @openapi
 * /auth/admin/reset-password:
 *   post:
 *     summary: Admin password reset — OWNER only. Resets another user's password without knowing their current password.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - newPassword
 *             properties:
 *               targetUserId:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       403:
 *         description: Only Owner can reset passwords
 */
router.post('/admin/reset-password', authenticateStaff, requireRoles('OWNER'), validate(adminResetPasswordSchema), authController.adminResetPassword);

module.exports = router;
