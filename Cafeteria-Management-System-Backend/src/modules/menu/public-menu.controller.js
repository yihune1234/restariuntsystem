const MealPeriod = require('./meal-period/meal-period.model');
const Category = require('./category/category.model');
const FoodItem = require('./food/food.model');
const Branch = require('../branches/branch.model');
const DailyStock = require('../inventory/daily-stock.model');
const { getTodayBusinessDate } = require('../../utils/date');
const { NotFoundError } = require('../../utils/errors');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class PublicMenuController {
  getPublicMenu = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { mealPeriodId } = req.query;

    const branch = await Branch.findOne({
      _id: branchId,
      isActive: true,
      deletedAt: null,
    });

    if (!branch) {
      throw new NotFoundError('Branch not found or inactive', 'BRANCH_NOT_FOUND');
    }

    // 1. Fetch active meal periods
    const mealPeriodFilter = {
      branchId,
      isActive: true,
      deletedAt: null,
    };
    if (mealPeriodId) {
      mealPeriodFilter._id = mealPeriodId;
    }

    const mealPeriods = await MealPeriod.find(mealPeriodFilter).sort({ displayOrder: 1, name: 1 });

    if (!mealPeriods.length) {
      return ApiResponse.success(res, 200, 'Public menu retrieved', {
        branch: {
          id: branch._id,
          name: branch.name,
          currency: branch.settings?.currency || 'ETB',
          taxRate: branch.settings?.taxRate || 0.15,
          openTime: branch.settings?.openTime,
          closeTime: branch.settings?.closeTime,
        },
        menu: [],
      });
    }

    const mealPeriodIds = mealPeriods.map((mp) => mp._id);

    // 2. Fetch active categories for these meal periods
    const categories = await Category.find({
      branchId,
      mealPeriodId: { $in: mealPeriodIds },
      isActive: true,
      deletedAt: null,
    }).sort({ displayOrder: 1, name: 1 });

    const categoryIds = categories.map((cat) => cat._id);

    // 3. Fetch active and available food items
    const foodItems = await FoodItem.find({
      branchId,
      categoryId: { $in: categoryIds },
      isActive: true,
      isAvailable: true,
      deletedAt: null,
    }).sort({ displayOrder: 1, name: 1 });

    // 4. Fetch today's daily stock to attach real-time stock availability status
    const businessDate = getTodayBusinessDate();
    const dailyStocks = await DailyStock.find({
      branchId,
      businessDate,
    });

    const stockMap = new Map();
    dailyStocks.forEach((stock) => {
      stockMap.set(stock.foodItemId.toString(), stock);
    });

    // 5. Structure into hierarchical tree: MealPeriod -> Categories -> Food Items
    const structuredMenu = mealPeriods.map((period) => {
      const periodCategories = categories
        .filter((cat) => cat.mealPeriodId.toString() === period._id.toString())
        .map((cat) => {
          const catFoodItems = foodItems
            .filter((food) => food.categoryId.toString() === cat._id.toString())
            .map((food) => {
              const stock = stockMap.get(food._id.toString());
              let stockStatus = 'AVAILABLE';
              let remainingQuantity = null;

              if (stock) {
                stockStatus = stock.status;
                remainingQuantity = stock.remainingQuantity;
              }

              return {
                id: food._id,
                name: food.name,
                nameEn: food.nameEn || '',
                nameOm: food.nameOm || '',
                nameAm: food.nameAm || '',
                description: food.description,
                descriptionEn: food.descriptionEn || '',
                descriptionOm: food.descriptionOm || '',
                descriptionAm: food.descriptionAm || '',
                price: food.price,
                imageUrl: food.imageUrl,
                preparationTimeMinutes: food.preparationTimeMinutes,
                stockStatus,
                remainingQuantity,
                isSoldOut: stockStatus === 'SOLD_OUT',
              };
            });

          return {
            id: cat._id,
            name: cat.name,
            nameEn: cat.nameEn || '',
            nameOm: cat.nameOm || '',
            nameAm: cat.nameAm || '',
            displayOrder: cat.displayOrder,
            foodItems: catFoodItems,
          };
        });

      return {
        id: period._id,
        name: period.name,
        nameEn: period.nameEn || '',
        nameOm: period.nameOm || '',
        nameAm: period.nameAm || '',
        startTime: period.startTime,
        endTime: period.endTime,
        displayOrder: period.displayOrder,
        categories: periodCategories,
      };
    });

    return ApiResponse.success(res, 200, 'Public menu retrieved successfully', {
      branch: {
        id: branch._id,
        name: branch.name,
        currency: branch.settings?.currency || 'ETB',
        taxRate: branch.settings?.taxRate || 0.15,
        openTime: branch.settings?.openTime,
        closeTime: branch.settings?.closeTime,
      },
      menu: structuredMenu,
    });
  });
}

module.exports = new PublicMenuController();
