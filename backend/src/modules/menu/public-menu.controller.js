const Category = require('./category/category.model');
const FoodItem = require('./food/food.model');
const MealPeriod = require('./meal-period/meal-period.model');
const Restaurant = require('../restaurant/restaurant.model');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { isTimeWithinWindow } = require('../../utils/date');

class PublicMenuController {
  getPublicMenu = asyncHandler(async (req, res) => {
    const now = new Date();

    const allMealPeriods = await MealPeriod.find({ isActive: true, deletedAt: null })
      .sort({ displayOrder: 1, startTime: 1 });

    const activeMealPeriods = allMealPeriods.filter((mp) =>
      isTimeWithinWindow(mp.startTime, mp.endTime, now)
    );
    // Fetch all active categories and items.
    const allCategories = await Category.find({
      isActive: true,
      isHidden: false,
      deletedAt: null,
    })
      .sort({ displayOrder: 1, name: 1 })
      .populate('mealScheduleIds', 'name startTime endTime');

    const allFoodItems = await FoodItem.find({
      isAvailable: true,
      deletedAt: null,
    }).sort({ displayOrder: 1, name: 1 });

    const validCategoryIds = new Set(
      allCategories.map((cat) => cat._id.toString())
    );

    const mealPeriodById = new Map(
      allMealPeriods.map((mp) => [mp._id.toString(), mp])
    );

    const itemsByCategory = new Map();

    allFoodItems.forEach((food) => {
      const catIds = (food.categoryIds || [])
        .map((cid) => cid.toString())
        .filter((cid) => validCategoryIds.has(cid));

      catIds.forEach((cid) => {
        if (!itemsByCategory.has(cid)) {
          itemsByCategory.set(cid, []);
        }
        itemsByCategory.get(cid).push(food);
      });
    });

    // A category appears in the menu when it holds at least one visible item.
    const visibleCategoryIds = new Set(
      allCategories
        .filter((cat) => itemsByCategory.has(cat._id.toString()))
        .map((cat) => cat._id.toString())
    );

    // Propagate visibility upward so child categories render their parents.
    let changed = true;
    while (changed) {
      changed = false;
      for (const cat of allCategories) {
        const catId = cat._id.toString();
        if (visibleCategoryIds.has(catId) && cat.parentId) {
          const parentId = cat.parentId.toString();
          if (validCategoryIds.has(parentId) && !visibleCategoryIds.has(parentId)) {
            visibleCategoryIds.add(parentId);
            changed = true;
          }
        }
      }
    }

    const visibleCategories = allCategories
      .filter((cat) => visibleCategoryIds.has(cat._id.toString()))
      // Only render categories that actually hold at least one visible item.
      .filter((cat) => (itemsByCategory.get(cat._id.toString()) || []).length > 0);

    // Build the flat menu list (parents and children), matching the API contract
    // the customer frontend already consumes.
    const menu = visibleCategories
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      .map((cat) => ({
        id: cat._id,
        name: cat.name,
        nameEn: cat.nameEn || '',
        nameOm: cat.nameOm || '',
        nameAm: cat.nameAm || '',
        displayOrder: cat.displayOrder,
        parentId: cat.parentId || null,
        mealSchedules: (cat.mealScheduleIds || []).map((mp) =>
          this.serializeMealSchedule(mp)
        ),
        foodItems: (itemsByCategory.get(cat._id.toString()) || []).map((food) =>
          this.serializeFoodItem(food, mealPeriodById)
        ),
      }));

    let restaurant = await Restaurant.findOne({ isActive: true });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: 'Faarees Kafee fi Restorraanti',
        nameEn: 'Faarees Kafee fi Restorraanti',
        nameAm: 'ፋሬስ ካፌ እና ሬስቶራንት',
        currency: 'ETB',
      });
    }

    const activeMealPeriodInfo = activeMealPeriods.map((mp) => ({
      id: mp._id,
      name: mp.name,
      nameEn: mp.nameEn || '',
      nameOm: mp.nameOm || '',
      nameAm: mp.nameAm || '',
      startTime: mp.startTime,
      endTime: mp.endTime,
    }));

    return ApiResponse.success(res, 200, 'Public menu retrieved successfully', {
      restaurant: {
        name: restaurant.name,
        nameEn: restaurant.nameEn,
        nameOm: restaurant.nameOm,
        nameAm: restaurant.nameAm,
        description: restaurant.description,
        descriptionEn: restaurant.descriptionEn,
        descriptionOm: restaurant.descriptionOm,
        descriptionAm: restaurant.descriptionAm,
        logoUrl: restaurant.logoUrl,
        coverUrl: restaurant.coverUrl,
        phone: restaurant.phone,
        address: restaurant.address,
        socialMedia: restaurant.socialMedia,
        currency: restaurant.currency || 'ETB',
      },
      categories: menu,
      activeMealPeriods: activeMealPeriodInfo,
      allMealPeriods: allMealPeriods.map((mp) => ({
        id: mp._id,
        name: mp.name,
        nameEn: mp.nameEn || '',
        nameOm: mp.nameOm || '',
        nameAm: mp.nameAm || '',
        startTime: mp.startTime,
        endTime: mp.endTime,
      })),
      serverTime: now.toISOString(),
    });
  });

  serializeMealSchedule(mp) {
    return {
      id: mp._id || mp,
      name: mp.name,
      startTime: mp.startTime,
      endTime: mp.endTime,
    };
  }

  serializeFoodItem(food, mealPeriodById = new Map()) {
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
      mealSchedules: (food.mealScheduleIds || []).map((id) => {
        const mp = mealPeriodById.get(id.toString());
        return {
          id,
          name: mp ? mp.name : 'Schedule',
          nameEn: mp ? mp.nameEn || '' : '',
          nameOm: mp ? mp.nameOm || '' : '',
          nameAm: mp ? mp.nameAm || '' : '',
          startTime: mp ? mp.startTime : null,
          endTime: mp ? mp.endTime : null,
        };
      }),
    };
  }
}

module.exports = new PublicMenuController();