const categoryService = require('./category.service');
const ApiResponse = require('../../../utils/response');
const asyncHandler = require('../../../utils/async-handler');
const socketEmitter = require('../../../sockets/socket.emitter');

class CategoryController {
  createCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body);
    return ApiResponse.created(res, 'Category created successfully', category);
  });

  getCategories = asyncHandler(async (req, res) => {
    const { activeOnly } = req.query;
    const categories = await categoryService.getCategories({
      activeOnly: activeOnly === 'true',
    });
    return ApiResponse.success(res, 200, 'Categories retrieved successfully', categories);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    return ApiResponse.success(res, 200, 'Category retrieved successfully', category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    socketEmitter.emitMenuCategoryUpdated(category);
    return ApiResponse.success(res, 200, 'Category updated successfully', category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const result = await categoryService.deleteCategory(req.params.id);
    return ApiResponse.success(res, 200, result.message);
  });

  reorderCategories = asyncHandler(async (req, res) => {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return ApiResponse.error(res, 400, 'orders must be an array of { id, displayOrder }');
    }
    const result = await categoryService.reorderCategories(orders);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new CategoryController();
