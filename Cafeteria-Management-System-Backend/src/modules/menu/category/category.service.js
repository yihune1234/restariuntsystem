const Category = require('./category.model');
const FoodItem = require('../food/food.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');

class CategoryService {
  async createCategory({ name, nameEn, nameOm, nameAm, displayOrder, mealPeriodIds, isAllDay, isHidden }) {
    const existing = await Category.findOne({
      name: name.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Category '${name}' already exists`, 'CATEGORY_EXISTS');
    }

    const category = await Category.create({
      name: name.toUpperCase(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      displayOrder: displayOrder || 0,
      isActive: true,
      isAllDay: isAllDay || false,
      isHidden: isHidden || false,
      mealPeriodIds: mealPeriodIds || [],
    });

    return category;
  }

  async getCategories({ activeOnly = false } = {}) {
    const filter = { deletedAt: null };

    if (activeOnly) {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .populate('mealPeriodIds', 'name nameEn nameOm nameAm startTime endTime')
      .sort({ displayOrder: 1, name: 1 });

    return categories;
  }

  async getCategoryById(id) {
    const category = await Category.findOne({ _id: id, deletedAt: null });
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async updateCategory(id, updateData) {
    if (updateData.name) {
      updateData.name = updateData.name.toUpperCase();
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    return category;
  }

  async deleteCategory(id) {
    const category = await Category.findOne({ _id: id, deletedAt: null });
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    await FoodItem.updateMany(
      { categoryId: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } }
    );

    await Category.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
      { new: true }
    );

    return { message: 'Category removed successfully' };
  }

  async reorderCategories(orders) {
    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id, deletedAt: null },
        update: { $set: { displayOrder } },
      },
    }));

    await Category.bulkWrite(bulkOps);
    return { message: 'Categories reordered successfully' };
  }
}

module.exports = new CategoryService();
