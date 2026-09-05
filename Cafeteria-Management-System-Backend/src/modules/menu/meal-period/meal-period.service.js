const MealPeriod = require('./meal-period.model');
const Category = require('../category/category.model');
const FoodItem = require('../food/food.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');

class MealPeriodService {
  async createMealPeriod({ name, nameEn, nameOm, nameAm, startTime, endTime, displayOrder, isActive }) {
    const existing = await MealPeriod.findOne({
      name: name.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Meal period '${name}' already exists`, 'MEAL_PERIOD_EXISTS');
    }

    const mealPeriod = await MealPeriod.create({
      name: name.toUpperCase(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      startTime,
      endTime,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    return mealPeriod;
  }

  async getMealPeriods({ activeOnly = false } = {}) {
    const filter = { deletedAt: null };
    if (activeOnly) filter.isActive = true;
    return MealPeriod.find(filter).sort({ displayOrder: 1 });
  }

  async getMealPeriodById(id) {
    const mealPeriod = await MealPeriod.findOne({ _id: id, deletedAt: null });
    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }
    return mealPeriod;
  }

  async updateMealPeriod(id, updateData) {
    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase();
    }
    const mealPeriod = await MealPeriod.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }
    return mealPeriod;
  }

  async deleteMealPeriod(id) {
    const mealPeriod = await MealPeriod.findOne({ _id: id, deletedAt: null });
    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }
    await MealPeriod.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } }
    );
    return { message: 'Meal period deleted successfully' };
  }
}

module.exports = new MealPeriodService();
