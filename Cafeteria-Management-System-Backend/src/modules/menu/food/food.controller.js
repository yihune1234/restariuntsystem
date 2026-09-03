const foodService = require('./food.service');
const ApiResponse = require('../../../utils/response');
const asyncHandler = require('../../../utils/async-handler');

class FoodController {
  createFood = asyncHandler(async (req, res) => {
    const food = await foodService.createFoodItem(
      req.params.branchId,
      req.body,
      req.user?._id,
      req.user?.organizationId
    );
    return ApiResponse.created(res, 'Food item created successfully', food);
  });

  getFoodItemsByBranch = asyncHandler(async (req, res) => {
    const { categoryId, availableOnly, activeOnly } = req.query;
    const foodItems = await foodService.getFoodItemsByBranch(req.params.branchId, {
      categoryId,
      availableOnly: availableOnly === 'true',
      activeOnly: activeOnly === 'true',
    });
    return ApiResponse.success(res, 200, 'Food items retrieved successfully', foodItems);
  });

  getFoodItemById = asyncHandler(async (req, res) => {
    const food = await foodService.getFoodItemById(req.params.foodId);
    return ApiResponse.success(res, 200, 'Food item retrieved successfully', food);
  });

  updateFoodItem = asyncHandler(async (req, res) => {
    const food = await foodService.updateFoodItem(
      req.params.foodId,
      req.body,
      req.user?._id,
      req.user?.organizationId,
      req.user?.branchId
    );
    return ApiResponse.success(res, 200, 'Food item updated successfully', food);
  });

  deleteFoodItem = asyncHandler(async (req, res) => {
    const result = await foodService.deleteFoodItem(
      req.params.foodId,
      req.user?._id,
      req.user?.organizationId,
      req.user?.branchId
    );
    return ApiResponse.success(res, 200, result.message);
  });

  removeImage = asyncHandler(async (req, res) => {
    const food = await foodService.removeFoodImage(req.params.foodId);
    return ApiResponse.success(res, 200, 'Food image removed successfully', food);
  });
}

module.exports = new FoodController();
