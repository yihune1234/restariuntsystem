const foodService = require('./food.service');
const ApiResponse = require('../../../utils/response');
const asyncHandler = require('../../../utils/async-handler');
const socketEmitter = require('../../../sockets/socket.emitter');

class FoodController {
  createFood = asyncHandler(async (req, res) => {
    const food = await foodService.createFoodItem(req.body);
    socketEmitter.emitMenuItemCreated(food);
    return ApiResponse.created(res, 'Food item created successfully', food);
  });

  getFoodItems = asyncHandler(async (req, res) => {
    const { categoryId, availableOnly, activeOnly, tags } = req.query;
    const tagList = tags ? tags.split(',').map(t => t.trim()) : undefined;
    const foodItems = await foodService.getFoodItems({
      categoryId,
      availableOnly: availableOnly === 'true',
      activeOnly: activeOnly === 'true',
      tags: tagList,
    });
    return ApiResponse.success(res, 200, 'Food items retrieved successfully', foodItems);
  });

  getFoodItemById = asyncHandler(async (req, res) => {
    const food = await foodService.getFoodItemById(req.params.foodId);
    return ApiResponse.success(res, 200, 'Food item retrieved successfully', food);
  });

  updateFoodItem = asyncHandler(async (req, res) => {
    const food = await foodService.updateFoodItem(req.params.foodId, req.body);
    socketEmitter.emitMenuItemUpdated(food);
    return ApiResponse.success(res, 200, 'Food item updated successfully', food);
  });

  deleteFoodItem = asyncHandler(async (req, res) => {
    const result = await foodService.deleteFoodItem(req.params.foodId);
    return ApiResponse.success(res, 200, result.message);
  });

  removeImage = asyncHandler(async (req, res) => {
    const food = await foodService.removeFoodImage(req.params.foodId);
    return ApiResponse.success(res, 200, 'Food image removed successfully', food);
  });

  reorderFoodItems = asyncHandler(async (req, res) => {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return ApiResponse.error(res, 400, 'orders must be an array of { id, displayOrder }');
    }
    const result = await foodService.reorderFoodItems(orders);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new FoodController();
