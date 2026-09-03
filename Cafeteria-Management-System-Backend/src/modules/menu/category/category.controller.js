const categoryService = require('./category.service');
const ApiResponse = require('../../../utils/response');
const asyncHandler = require('../../../utils/async-handler');

class CategoryController {
  createCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(
      req.params.branchId,
      req.body,
      req.user?._id,
      req.user?.organizationId
    );
    return ApiResponse.created(res, 'Category created successfully', category);
  });

  getCategoriesByBranch = asyncHandler(async (req, res) => {
    const { mealPeriodId, activeOnly } = req.query;
    const categories = await categoryService.getCategoriesByBranch(req.params.branchId, {
      mealPeriodId,
      activeOnly: activeOnly === 'true',
    });
    return ApiResponse.success(res, 200, 'Categories retrieved successfully', categories);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    return ApiResponse.success(res, 200, 'Category retrieved successfully', category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body,
      req.user?._id,
      req.user?.organizationId,
      req.user?.branchId
    );
    return ApiResponse.success(res, 200, 'Category updated successfully', category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const result = await categoryService.deleteCategory(
      req.params.id,
      req.user?._id,
      req.user?.organizationId,
      req.user?.branchId
    );
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new CategoryController();
