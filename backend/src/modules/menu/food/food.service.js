const FoodItem = require('./food.model');
const Category = require('../category/category.model');
const uploadService = require('../../uploads/upload.service');
const { NotFoundError } = require('../../../utils/errors');
const logger = require('../../../config/logger');

class FoodService {
  async createFoodItem({ categoryIds, name, nameEn, nameOm, nameAm, description, descriptionEn, descriptionOm, descriptionAm, price, preparationTimeMinutes, displayOrder, isAvailable, isAlwaysAvailable, isHidden, isFeatured, mealScheduleIds, tags, variantGroups }) {
    if (!categoryIds || categoryIds.length === 0) {
      throw new NotFoundError('At least one category is required', 'CATEGORY_NOT_FOUND');
    }

    const categories = await Category.find({
      _id: { $in: categoryIds },
      deletedAt: null,
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundError('One or more categories not found', 'CATEGORY_NOT_FOUND');
    }

    const foodItem = await FoodItem.create({
      categoryIds,
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
      isAlwaysAvailable: isAlwaysAvailable || false,
      isHidden: isHidden || false,
      isFeatured: isFeatured || false,
      isActive: true,
      mealScheduleIds: mealScheduleIds || [],
      tags: tags || [],
      variantGroups: variantGroups || [],
    });

    return foodItem;
  }

  async getFoodItems({ categoryIds = [], availableOnly = false, activeOnly = false, tags } = {}) {
    const filter = { deletedAt: null };

    if (categoryIds && categoryIds.length > 0) filter.categoryIds = { $in: categoryIds };
    if (availableOnly) filter.isAvailable = true;
    if (activeOnly) filter.isActive = true;
    if (tags && tags.length > 0) filter.tags = { $in: tags };

    const foodItems = await FoodItem.find(filter)
      .populate('categoryIds', 'name nameEn nameOm nameAm')
      .sort({ displayOrder: 1, name: 1 });

    return foodItems;
  }

  async getFoodItemById(foodId) {
    const foodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null })
      .populate('categoryIds', 'name nameEn nameOm nameAm')
      .populate('mealScheduleIds', 'name startTime endTime');
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }
    return foodItem;
  }

  async updateFoodItem(foodId, updateData) {
    if (updateData.categoryIds) {
      const categories = await Category.find({
        _id: { $in: updateData.categoryIds },
        deletedAt: null,
      });
      if (categories.length !== updateData.categoryIds.length) {
        throw new NotFoundError('One or more categories not found', 'CATEGORY_NOT_FOUND');
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
