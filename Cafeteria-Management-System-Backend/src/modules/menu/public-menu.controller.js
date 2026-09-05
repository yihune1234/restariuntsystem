const Category = require('./category/category.model');
const FoodItem = require('./food/food.model');
const MealPeriod = require('./meal-period/meal-period.model');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

const isMealPeriodActive = (mealPeriod) => {
  if (!mealPeriod || !mealPeriod.isActive) return false;
  const now = new Date();
  const [hours, minutes] = now.toTimeString().slice(0, 5).split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;
  const [startH, startM] = (mealPeriod.startTime || '00:00').split(':').map(Number);
  const [endH, endM] = (mealPeriod.endTime || '23:59').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};

class PublicMenuController {
  getPublicMenu = asyncHandler(async (req, res) => {
    const categories = await Category.find({
      isActive: true,
      isHidden: false,
      deletedAt: null,
    }).sort({ displayOrder: 1, name: 1 });

    const categoryIds = categories.map((cat) => cat._id);

    const foodItems = await FoodItem.find({
      categoryId: { $in: categoryIds },
      isActive: true,
      isHidden: false,
      isAvailable: true,
      deletedAt: null,
    }).sort({ displayOrder: 1, name: 1 });

    let mealPeriods = [];
    try {
      mealPeriods = await MealPeriod.find({
        isActive: true,
        deletedAt: null,
      }).sort({ displayOrder: 1 });
    } catch {
      mealPeriods = [];
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const structuredMenu = categories.map((cat) => {
      const catFoodItems = foodItems
        .filter((food) => food.categoryId.toString() === cat._id.toString())
        .map((food) => ({
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
          tags: food.tags || [],
          isFeatured: food.isFeatured || false,
          mealPeriodIds: (food.mealPeriodIds || []).map((id) => String(id)),
          variantGroups: (food.variantGroups || []).map(vg => ({
            id: vg._id,
            name: vg.name,
            nameEn: vg.nameEn || '',
            nameOm: vg.nameOm || '',
            nameAm: vg.nameAm || '',
            required: vg.required || false,
            multiSelect: vg.multiSelect || false,
            maxSelect: vg.maxSelect || 1,
            options: (vg.options || []).map(opt => ({
              id: opt._id,
              name: opt.name,
              nameEn: opt.nameEn || '',
              nameOm: opt.nameOm || '',
              nameAm: opt.nameAm || '',
              priceModifier: opt.priceModifier || 0,
              isAvailable: opt.isAvailable !== false,
            })),
          })),
        }));

      return {
        id: cat._id,
        name: cat.name,
        nameEn: cat.nameEn || '',
        nameOm: cat.nameOm || '',
        nameAm: cat.nameAm || '',
        displayOrder: cat.displayOrder,
        mealPeriodIds: cat.mealPeriodIds || [],
        isAllDay: cat.isAllDay || false,
        foodItems: catFoodItems,
      };
    });

    const structuredMealPeriods = mealPeriods.map((mp) => {
      let [startH, startM] = (mp.startTime || '00:00').split(':').map(Number);
      let [endH, endM] = (mp.endTime || '23:59').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const isCurrentlyActive = mp.name === 'ALL_DAY'
        ? true
        : (startMinutes <= endMinutes
          ? (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes)
          : (currentTotalMinutes >= startMinutes || currentTotalMinutes <= endMinutes));

      return {
        id: String(mp._id),
        name: mp.name,
        nameEn: mp.nameEn || '',
        nameOm: mp.nameOm || '',
        nameAm: mp.nameAm || '',
        startTime: mp.startTime,
        endTime: mp.endTime,
        displayOrder: mp.displayOrder,
        isCurrentlyActive,
      };
    });

    const menuCategories = structuredMenu.map((cat) => ({
      ...cat,
      id: String(cat.id),
      mealPeriodIds: (cat.mealPeriodIds || []).map((id) => String(id)),
    }));

    const itemBelongsToMealPeriod = (item, mealPeriodId, isAllDay) => {
      if (isAllDay) return true;
      const itemMpIds = item.mealPeriodIds || [];
      if (itemMpIds.length === 0) return true;
      return itemMpIds.includes(mealPeriodId);
    };

    const categoryBelongsToMealPeriod = (cat, mealPeriodId, isAllDay) => {
      if (isAllDay) return true;
      if (cat.isAllDay) return true;
      if (cat.mealPeriodIds.length === 0) return true;
      return cat.mealPeriodIds.includes(mealPeriodId);
    };

    let menu;
    if (structuredMealPeriods.length === 0) {
      menu = [
        {
          id: 'all',
          name: 'ALL',
          nameEn: 'All',
          nameOm: '',
          nameAm: '',
          startTime: '00:00',
          endTime: '23:59',
          displayOrder: 0,
          isCurrentlyActive: true,
          categories: menuCategories,
        },
      ];
    } else {
      menu = structuredMealPeriods.map((mp) => {
        const isAllDay = mp.name === 'ALL_DAY';
        return {
          ...mp,
          categories: menuCategories
            .filter((cat) => categoryBelongsToMealPeriod(cat, mp.id, isAllDay))
            .map((cat) => ({
              ...cat,
              foodItems: (cat.foodItems || []).filter(
                (item) => itemBelongsToMealPeriod(item, mp.id, isAllDay)
              ),
            })),
        };
      });
    }

    const allDayPeriod = structuredMealPeriods.find((mp) => mp.name === 'ALL_DAY');
    const activePeriods = structuredMealPeriods.filter(
      (mp) => mp.isCurrentlyActive && mp.name !== 'ALL_DAY'
    );

    return ApiResponse.success(res, 200, 'Public menu retrieved successfully', {
      restaurant: {
        name: 'Faarees Kaafee fi Restoorraantii',
        nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
        currency: 'ETB',
        taxRate: 0.15,
      },
      mealPeriods: structuredMealPeriods,
      activeMealPeriodIds: structuredMealPeriods.length === 0
        ? ['all']
        : [
            ...allDayPeriod ? [allDayPeriod.id] : [],
            ...activePeriods.filter((mp) => mp.isCurrentlyActive).map((mp) => mp.id),
          ],
      menu,
    });
  });
}

module.exports = new PublicMenuController();
