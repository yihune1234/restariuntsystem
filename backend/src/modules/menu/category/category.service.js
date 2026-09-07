const Category = require('./category.model');
const FoodItem = require('../food/food.model');
const { NotFoundError, ConflictError } = require('../../../utils/errors');

class CategoryService {
  async createCategory({ name, nameEn, nameOm, nameAm, parentId, displayOrder, mealScheduleIds, isHidden }) {
    const existing = await Category.findOne({
      name: name.toUpperCase(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Category '${name}' already exists`, 'CATEGORY_EXISTS');
    }

    if (parentId) {
      const parent = await Category.findOne({ _id: parentId, deletedAt: null });
      if (!parent) {
        throw new NotFoundError('Parent category not found', 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    const category = await Category.create({
      name: name.toUpperCase(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      parentId: parentId || null,
      displayOrder: displayOrder || 0,
      isActive: true,
      isHidden: isHidden || false,
      mealScheduleIds: mealScheduleIds || [],
    });

    return category;
  }

  async getCategories({ activeOnly = false } = {}) {
    const filter = { deletedAt: null };

    if (activeOnly) {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .populate('mealScheduleIds', 'name startTime endTime');

    return categories;
  }

  async getCategoryById(id) {
    const category = await Category.findOne({ _id: id, deletedAt: null })
      .populate('mealScheduleIds', 'name startTime endTime');
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async getCategoryTree({ activeOnly = false } = {}) {
    const filter = { deletedAt: null, parentId: null };
    if (activeOnly) {
      filter.isActive = true;
    }

    const rootCategories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .populate('mealScheduleIds', 'name startTime endTime');

    const buildTree = async (parentIds) => {
      const childrenFilter = { deletedAt: null, parentId: { $in: parentIds } };
      if (activeOnly) {
        childrenFilter.isActive = true;
      }
      const children = await Category.find(childrenFilter)
        .sort({ displayOrder: 1, name: 1 })
        .populate('mealScheduleIds', 'name startTime endTime');
      return children;
    };

    const allCategories = await Category.find({ deletedAt: null, parentId: { $ne: null } })
      .sort({ displayOrder: 1, name: 1 })
      .populate('mealScheduleIds', 'name startTime endTime');

    const tree = rootCategories.map((root) => {
      const children = allCategories.filter(
        (cat) => cat.parentId && cat.parentId.toString() === root._id.toString()
      );
      return {
        ...root.toJSON(),
        children: children.map((child) => child.toJSON()),
      };
    });

    return tree;
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
      { categoryIds: id, deletedAt: null },
      { $pull: { categoryIds: id } }
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
