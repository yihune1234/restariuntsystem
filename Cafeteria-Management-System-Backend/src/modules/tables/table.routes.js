const express = require('express');
const tableController = require('./table.controller');
const {
  createTableSchema,
  updateTableSchema,
  tableIdParamSchema,
  qrTokenParamSchema,
} = require('./table.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const tableRouter = express.Router();
const publicQrRouter = express.Router();

publicQrRouter.get('/:qrToken', validate(qrTokenParamSchema), tableController.validateQR);

tableRouter.use(authenticateStaff);

tableRouter.get('/', requireRoles('OWNER', 'MANAGER', 'CASHIER'), tableController.getTables);

tableRouter.post('/', validate(createTableSchema), requireRoles('OWNER', 'MANAGER'), tableController.createTable);

tableRouter.get('/:tableId', validate(tableIdParamSchema), requireRoles('OWNER', 'MANAGER', 'CASHIER'), tableController.getTableById);

tableRouter.patch('/:tableId', validate(updateTableSchema), requireRoles('OWNER', 'MANAGER'), tableController.updateTable);

tableRouter.delete('/:tableId', validate(tableIdParamSchema), requireRoles('OWNER', 'MANAGER'), tableController.deactivateTable);

tableRouter.post('/:tableId/regenerate-qr', validate(tableIdParamSchema), requireRoles('OWNER', 'MANAGER'), tableController.regenerateQR);

module.exports = {
  tableRouter,
  publicQrRouter,
};
