const express = require('express');
const customerSessionController = require('./customer-session.controller');
const { createSessionSchema } = require('./customer-session.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateCustomer } = require('../../middleware/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /customer-sessions:
 *   post:
 *     summary: Initialize customer session upon scanning table QR code
 *     tags:
 *       - Customer Sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrToken
 *             properties:
 *               qrToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session token returned
 */
router.post('/', validate(createSessionSchema), customerSessionController.createSession);

/**
 * @openapi
 * /customer-sessions/me:
 *   get:
 *     summary: Get active customer session status and branch info
 *     tags:
 *       - Customer Sessions
 *     security:
 *       - customerSessionAuth: []
 *     responses:
 *       200:
 *         description: Active customer session details
 */
router.get('/me', authenticateCustomer, customerSessionController.getCurrentSession);

/**
 * @openapi
 * /customer-sessions/close:
 *   post:
 *     summary: Explicitly end customer session
 *     tags:
 *       - Customer Sessions
 *     security:
 *       - customerSessionAuth: []
 *     responses:
 *       200:
 *         description: Session ended
 */
router.post('/close', authenticateCustomer, customerSessionController.closeSession);

module.exports = router;
