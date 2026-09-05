const mealPeriodService = require('./meal-period.service');
const ApiResponse = require('../../../utils/response');
const asyncHandler = require('../../../utils/async-handler');

class MealPeriodController {
  createMealPeriod = asyncHandler(async (req, res) => {
    const mealPeriod = await mealPeriodService.createMealPeriod(req.body);
    return ApiResponse.created(res, 'Meal period created successfully', mealPeriod);
  });

  getMealPeriods = asyncHandler(async (req, res) => {
    const { activeOnly } = req.query;
    const mealPeriods = await mealPeriodService.getMealPeriods({ activeOnly: activeOnly === 'true' });
    return ApiResponse.success(res, 200, 'Meal periods retrieved successfully', mealPeriods);
  });

  getMealPeriodById = asyncHandler(async (req, res) => {
    const mealPeriod = await mealPeriodService.getMealPeriodById(req.params.id);
    return ApiResponse.success(res, 200, 'Meal period retrieved successfully', mealPeriod);
  });

  updateMealPeriod = asyncHandler(async (req, res) => {
    const mealPeriod = await mealPeriodService.updateMealPeriod(req.params.id, req.body);
    return ApiResponse.success(res, 200, 'Meal period updated successfully', mealPeriod);
  });

  deleteMealPeriod = asyncHandler(async (req, res) => {
    const result = await mealPeriodService.deleteMealPeriod(req.params.id);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new MealPeriodController();
