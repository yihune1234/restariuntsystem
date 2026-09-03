const MealPeriod = require('./meal-period.model');
const Branch = require('../../branches/branch.model');
const Category = require('../category/category.model');
const FoodItem = require('../food/food.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');
const auditService = require('../../audit/audit.service');

class MealPeriodService {
  async createMealPeriod(branchId, { name, nameEn, nameOm, nameAm, startTime, endTime, displayOrder, isActive }, userId, organizationId) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const existing = await MealPeriod.findOne({
      branchId,
      name: name.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Meal period '${name}' already exists in this branch`, 'MEAL_PERIOD_EXISTS');
    }

    const mealPeriod = await MealPeriod.create({
      branchId,
      name: name.toUpperCase(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      startTime,
      endTime,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Log audit action
    await auditService.logAction({
      organizationId: organizationId || branch.organizationId,
      branchId,
      userId,
      action: 'CREATE_MEAL_PERIOD',
      entityType: 'MealPeriod',
      entityId: mealPeriod._id,
      newValue: mealPeriod.toObject(),
    });

    return mealPeriod;
  }

  async getMealPeriodsByBranch(branchId, { activeOnly = false } = {}) {
    const filter = {
      branchId,
      deletedAt: null,
    };

    if (activeOnly) {
      filter.isActive = true;
    }

    const mealPeriods = await MealPeriod.find(filter).sort({ displayOrder: 1, name: 1 });
    return mealPeriods;
  }

  async getMealPeriodById(id) {
    const mealPeriod = await MealPeriod.findOne({ _id: id, deletedAt: null });
    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }
    return mealPeriod;
  }

  async updateMealPeriod(id, updateData, userId, organizationId, branchId) {
    const oldMealPeriod = await MealPeriod.findOne({ _id: id, deletedAt: null });
    if (!oldMealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }

    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase();
    }

    const mealPeriod = await MealPeriod.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Determine the specific action based on what changed
    let action = 'UPDATE_MEAL_PERIOD';
    if (updateData.isActive !== undefined) {
      action = updateData.isActive ? 'ACTIVATE_MEAL_PERIOD' : 'DEACTIVATE_MEAL_PERIOD';
    }

    await auditService.logAction({
      organizationId,
      branchId: branchId || oldMealPeriod.branchId,
      userId,
      action,
      entityType: 'MealPeriod',
      entityId: mealPeriod._id,
      oldValue: oldMealPeriod.toObject(),
      newValue: mealPeriod.toObject(),
    });

    return mealPeriod;
  }

  async deleteMealPeriod(id, userId, organizationId, branchId) {
    const mealPeriod = await MealPeriod.findOne({ _id: id, deletedAt: null });
    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found', 'MEAL_PERIOD_NOT_FOUND');
    }

    const oldData = mealPeriod.toObject();

    // Cascade soft-delete to all child categories and their food items
    // so they don't become orphaned (active items under an inactive
    // category/meal period never appear in menus).
    const childCategories = await Category.find({ mealPeriodId: id, deletedAt: null });
    const childCategoryIds = childCategories.map(c => c._id);

    if (childCategoryIds.length > 0) {
      await FoodItem.updateMany(
        { categoryId: { $in: childCategoryIds }, deletedAt: null },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      await Category.updateMany(
        { _id: { $in: childCategoryIds }, deletedAt: null },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
    }

    await MealPeriod.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );

    await auditService.logAction({
      organizationId,
      branchId: branchId || mealPeriod.branchId,
      userId,
      action: 'DELETE_MEAL_PERIOD',
      entityType: 'MealPeriod',
      entityId: mealPeriod._id,
      oldValue: oldData,
    });

    return { message: 'Meal period removed successfully' };
  }
}

module.exports = new MealPeriodService();
