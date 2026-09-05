const express = require('express');
const reportController = require('./report.controller');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const reportRouter = express.Router();

reportRouter.use(authenticateStaff);

reportRouter.get('/sales', requireRoles('OWNER', 'MANAGER'), reportController.getSalesReport);

reportRouter.get('/orders', requireRoles('OWNER', 'MANAGER'), reportController.getOrdersReport);

reportRouter.get('/payments', requireRoles('OWNER', 'MANAGER', 'CASHIER'), reportController.getPaymentsReport);

reportRouter.get('/food', requireRoles('OWNER', 'MANAGER'), reportController.getFoodReport);

reportRouter.get('/dashboard', requireRoles('OWNER', 'MANAGER'), reportController.getDashboardKPIs);

reportRouter.get('/hourly-sales', requireRoles('OWNER', 'MANAGER'), reportController.getHourlySalesAnalysis);

module.exports = {
  reportRouter,
};
