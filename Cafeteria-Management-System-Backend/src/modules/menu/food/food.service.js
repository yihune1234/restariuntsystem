const FoodItem = require('./food.model');
const Category = require('../category/category.model');
const uploadService = require('../../uploads/upload.service');
const { NotFoundError } = require('../../../utils/errors');
const logger = require('../../../config/logger');

class FoodService {
  async createFoodItem({ categoryId, name, nameEn, nameOm, nameAm, description, descriptionEn, descriptionOm, descriptionAm, price, preparationTimeMinutes, displayOrder, isAvailable, isHidden, isFeatured, mealPeriodIds, tags, variantGroups }) {
    const category = await Category.findOne({
      _id: categoryId,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    const foodItem = await FoodItem.create({
      categoryId,
      name: name.trim(),
      nameEn: nameEn || '',
      nameOm: nameOm || '',
      nameAm: nameAm || '',
      description: description || '',
      descriptionEn: descriptionEn || '',
      descriptionOm: descriptionOm || '',
      descriptionAm: descriptionAm || '',
      price,
      preparationTimeMinutes: preparationTimeMinutes || 15,
      displayOrder: displayOrder || 0,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isHidden: isHidden || false,
      isFeatured: isFeatured || false,
      isActive: true,
      mealPeriodIds: mealPeriodIds || [],
      tags: tags || [],
      variantGroups: variantGroups || [],
    });

    return foodItem;
  }

  async getFoodItems({ categoryId, availableOnly = false, activeOnly = false, tags } = {}) {
    const filter = { deletedAt: null };

    if (categoryId) filter.categoryId = categoryId;
    if (availableOnly) filter.isAvailable = true;
    if (activeOnly) filter.isActive = true;
    if (tags && tags.length > 0) filter.tags = { $in: tags };

    const foodItems = await FoodItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ displayOrder: 1, name: 1 });

    return foodItems;
  }

  async getFoodItemById(foodId) {
    const foodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null }).populate('categoryId', 'name');
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }
    return foodItem;
  }

  async updateFoodItem(foodId, updateData) {
    if (updateData.categoryId) {
      const category = await Category.findOne({
        _id: updateData.categoryId,
        deletedAt: null,
      });
      if (!category) {
        throw new NotFoundError('Target category not found', 'CATEGORY_NOT_FOUND');
      }
    }

    const foodItem = await FoodItem.findOneAndUpdate(
      { _id: foodId, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

    return foodItem;
  }

  async updateFoodImage(foodId, { imageUrl, imagePublicId }) {
    const foodItem = await this.getFoodItemById(foodId);

    if (foodItem.imagePublicId && foodItem.imagePublicId !== imagePublicId) {
      try {
        await uploadService.deleteImage(foodItem.imagePublicId);
      } catch (err) {
        logger.warn(`Failed to delete old image: ${err.message}`);
      }
    }

    foodItem.imageUrl = imageUrl;
    foodItem.imagePublicId = imagePublicId;
    await foodItem.save();

    return foodItem;
  }

  async removeFoodImage(foodId) {
    const foodItem = await this.getFoodItemById(foodId);

    if (foodItem.imagePublicId) {
      try {
        await uploadService.deleteImage(foodItem.imagePublicId);
      } catch (err) {
        logger.warn(`Failed to delete image: ${err.message}`);
      }
    }

    foodItem.imageUrl = '';
    foodItem.imagePublicId = '';
    await foodItem.save();

    return foodItem;
  }

  async deleteFoodItem(foodId) {
    const foodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null });
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

    await FoodItem.findOneAndUpdate(
      { _id: foodId, deletedAt: null },
      { $set: { isActive: false, isAvailable: false, deletedAt: new Date() } },
      { new: true }
    );

    return { message: 'Food item deleted successfully' };
  }

  async reorderFoodItems(orders) {
    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id, deletedAt: null },
        update: { $set: { displayOrder } },
      },
    }));

    await FoodItem.bulkWrite(bulkOps);
    return { message: 'Food items reordered successfully' };
  }
}

module.exports = new FoodService();
