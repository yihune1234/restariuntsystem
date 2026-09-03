const express = require('express');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/response');

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: System health check and diagnostics
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: System is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "System is healthy" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, example: "UP" }
 *                     timestamp: { type: string, example: "2026-08-28T20:54:30.000Z" }
 *                     uptime: { type: number, example: 120.45 }
 *                     database: { type: string, example: "CONNECTED" }
 *                     memoryUsage: { type: object }
 */
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';

  const healthData = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  };

  return ApiResponse.success(res, 200, 'System is healthy and operational', healthData);
});

module.exports = router;
