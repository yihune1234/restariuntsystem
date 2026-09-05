const express = require('express');
const categoryController = require('./category.controller');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('./category.validation');
const validate = require('../../../middleware/validation.middleware');
const { authenticateStaff } = require('../../../middleware/auth.middleware');
const { requireRoles } = require('../../../middleware/role.middleware');

const categoryRouter = express.Router();

categoryRouter.use(authenticateStaff);

categoryRouter.get('/', requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'), categoryController.getCategories);

categoryRouter.post('/', validate(createCategorySchema), requireRoles('OWNER', 'MANAGER'), categoryController.createCategory);

categoryRouter.get('/:id', validate(categoryIdParamSchema), requireRoles('OWNER', 'MANAGER'), categoryController.getCategoryById);

categoryRouter.patch('/:id', validate(updateCategorySchema), requireRoles('OWNER', 'MANAGER'), categoryController.updateCategory);

categoryRouter.delete('/:id', validate(categoryIdParamSchema), requireRoles('OWNER', 'MANAGER'), categoryController.deleteCategory);

categoryRouter.patch('/reorder', requireRoles('OWNER', 'MANAGER'), categoryController.reorderCategories);

module.exports = {
  categoryRouter,
};
