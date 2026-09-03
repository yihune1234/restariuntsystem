const Category = require('./category.model');
const MealPeriod = require('../meal-period/meal-period.model');
const Branch = require('../../branches/branch.model');
const FoodItem = require('../food/food.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');
const auditService = require('../../audit/audit.service');

class CategoryService {
  async createCategory(branchId, { mealPeriodId, name, nameEn, nameOm, nameAm, displayOrder }, userId, organizationId) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const mealPeriod = await MealPeriod.findOne({
      _id: mealPeriodId,
      branchId,
      deletedAt: null,
    });

    if (!mealPeriod) {
      throw new NotFoundError('Meal period not found in this branch', 'MEAL_PERIOD_NOT_FOUND');
    }

    const existing = await Category.findOne({
      branchId,
      mealPeriodId,
      name: name.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Category '${name}' already exists in this meal period`, 'CATEGORY_EXISTS');
    }

    const category = await Category.create({
      branchId,
      mealPeriodId,
      name: name.toUpperCase(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      displayOrder: displayOrder || 0,
      isActive: true,
    });

    await auditService.logAction({
      organizationId: organizationId || branch.organizationId,
      branchId,
      userId,
      action: 'CREATE_CATEGORY',
      entityType: 'Category',
      entityId: category._id,
      newValue: category.toObject(),
    });

    return category;
  }

  async getCategoriesByBranch(branchId, { mealPeriodId, activeOnly = false } = {}) {
    const filter = {
      branchId,
      deletedAt: null,
    };

    if (mealPeriodId) {
      filter.mealPeriodId = mealPeriodId;
    }

    if (activeOnly) {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .populate('mealPeriodId', 'name startTime endTime')
      .sort({ displayOrder: 1, name: 1 });

    return categories;
  }

  async getCategoryById(id) {
    const category = await Category.findOne({ _id: id, deletedAt: null }).populate('mealPeriodId', 'name');
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async updateCategory(id, updateData, userId, organizationId, branchId) {
    const oldCategory = await Category.findOne({ _id: id, deletedAt: null });
    if (!oldCategory) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase();
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    let action = 'UPDATE_CATEGORY';
    if (updateData.isActive !== undefined) {
      action = updateData.isActive ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY';
    }
    if (updateData.mealPeriodId && updateData.mealPeriodId !== oldCategory.mealPeriodId.toString()) {
      action = 'CHANGE_MEAL_PERIOD_ASSIGNMENT';
    }

    await auditService.logAction({
      organizationId,
      branchId: branchId || oldCategory.branchId,
      userId,
      action,
      entityType: 'Category',
      entityId: category._id,
      oldValue: oldCategory.toObject(),
      newValue: category.toObject(),
    });

    return category;
  }

  async deleteCategory(id, userId, organizationId, branchId) {
    const category = await Category.findOne({ _id: id, deletedAt: null });
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    const oldData = category.toObject();

    // Cascade soft-delete to all child food items so they don't become
    // orphaned (active items under an inactive category never appear in menus).
    await FoodItem.updateMany(
      { categoryId: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } }
    );

    await Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );

    await auditService.logAction({
      organizationId,
      branchId: branchId || category.branchId,
      userId,
      action: 'DELETE_CATEGORY',
      entityType: 'Category',
      entityId: category._id,
      oldValue: oldData,
    });

    return { message: 'Category removed successfully' };
  }
}

module.exports = new CategoryService();
