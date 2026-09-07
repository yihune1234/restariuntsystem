const MealPeriod = require('./meal-period.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');

class MealPeriodService {
  async createMealPeriod({ name, nameEn, nameOm, nameAm, startTime, endTime, displayOrder }) {
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
      isActive: true,
    });

    return mealPeriod;
  }

  async getMealPeriods({ activeOnly = false } = {}) {
    const filter = { deletedAt: null };

    if (activeOnly) {
      filter.isActive = true;
    }

    const mealPeriods = await MealPeriod.find(filter)
      .sort({ displayOrder: 1, startTime: 1 });

    return mealPeriods;
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

    if (updateData.name) {
      const existing = await MealPeriod.findOne({
        name: updateData.name,
        _id: { $ne: id },
        deletedAt: null,
      });
      if (existing) {
        throw new ConflictError(`Meal period '${updateData.name}' already exists`, 'MEAL_PERIOD_EXISTS');
      }
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
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );

    return { message: 'Meal period deleted successfully' };
  }

  async reorderMealPeriods(orders) {
    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id, deletedAt: null },
        update: { $set: { displayOrder } },
      },
    }));

    await MealPeriod.bulkWrite(bulkOps);
    return { message: 'Meal periods reordered successfully' };
  }
}

module.exports = new MealPeriodService();
