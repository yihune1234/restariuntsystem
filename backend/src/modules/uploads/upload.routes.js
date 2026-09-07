const express = require('express');
const uploadController = require('./upload.controller');
const upload = require('../../middleware/upload.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const router = express.Router();

/**
 * @openapi
 * /food-items/{foodId}/image:
 *   post:
 *     summary: Upload and attach image to food item (Manager only)
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded and attached
 */
router.post(
  '/:foodId/image',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER'),
  upload.single('image'),
  uploadController.uploadFoodImage
);

module.exports = router;
