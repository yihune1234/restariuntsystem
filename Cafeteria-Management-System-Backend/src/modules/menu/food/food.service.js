const FoodItem = require('./food.model');
const Category = require('../category/category.model');
const Branch = require('../../branches/branch.model');
const uploadService = require('../../uploads/upload.service');
const { NotFoundError, ConflictError } = require('../../../utils/errors');
const logger = require('../../../config/logger');
const auditService = require('../../audit/audit.service');

class FoodService {
  async createFoodItem(branchId, { categoryId, name, nameEn, nameOm, nameAm, description, descriptionEn, descriptionOm, descriptionAm, price, preparationTimeMinutes, displayOrder, isAvailable }, userId, organizationId) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const category = await Category.findOne({
      _id: categoryId,
      branchId,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundError('Category not found in this branch', 'CATEGORY_NOT_FOUND');
    }

    const foodItem = await FoodItem.create({
      branchId,
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
      isActive: true,
    });

    await auditService.logAction({
      organizationId: organizationId || branch.organizationId,
      branchId,
      userId,
      action: 'CREATE_FOOD_ITEM',
      entityType: 'FoodItem',
      entityId: foodItem._id,
      newValue: foodItem.toObject(),
    });

    return foodItem;
  }

  async getFoodItemsByBranch(branchId, { categoryId, availableOnly = false, activeOnly = false } = {}) {
    const filter = {
      branchId,
      deletedAt: null,
    };

    if (categoryId) filter.categoryId = categoryId;
    if (availableOnly) filter.isAvailable = true;
    if (activeOnly) filter.isActive = true;

    const foodItems = await FoodItem.find(filter)
      .populate('categoryId', 'name mealPeriodId')
      .sort({ displayOrder: 1, name: 1 });

    return foodItems;
  }

  async getFoodItemById(foodId) {
    const foodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null }).populate('categoryId', 'name mealPeriodId');
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }
    return foodItem;
  }

  async updateFoodItem(foodId, updateData, userId, organizationId, branchId) {
    const oldFoodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null });
    if (!oldFoodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

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

    let action = 'UPDATE_FOOD_ITEM';
    if (updateData.isAvailable !== undefined && updateData.isAvailable !== oldFoodItem.isAvailable) {
      action = 'CHANGE_FOOD_AVAILABILITY';
    }
    if (updateData.isActive !== undefined) {
      action = updateData.isActive ? 'ACTIVATE_FOOD_ITEM' : 'DEACTIVATE_FOOD_ITEM';
    }
    if (updateData.price !== undefined && updateData.price !== oldFoodItem.price) {
      action = 'CHANGE_PRICE';
    }
    if (updateData.categoryId && updateData.categoryId !== oldFoodItem.categoryId.toString()) {
      action = 'CHANGE_CATEGORY_ASSIGNMENT';
    }

    await auditService.logAction({
      organizationId,
      branchId: branchId || oldFoodItem.branchId,
      userId,
      action,
      entityType: 'FoodItem',
      entityId: foodItem._id,
      oldValue: oldFoodItem.toObject(),
      newValue: foodItem.toObject(),
    });

    return foodItem;
  }

  /**
   * Set or update image references and cleanup the previous asset if replaced.
   * Delegates deletion to the upload service, which handles both Cloudinary
   * assets and locally-stored files (/uploads/... paths).
   */
  async updateFoodImage(foodId, { imageUrl, imagePublicId }) {
    const foodItem = await this.getFoodItemById(foodId);

    // If there was an existing image and a new one is uploaded, cleanup old asset
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

  /**
   * Remove image from food item and delete the stored asset
   * (Cloudinary asset, or local file when using the disk fallback).
   */
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

  async deleteFoodItem(foodId, userId, organizationId, branchId) {
    const foodItem = await FoodItem.findOne({ _id: foodId, deletedAt: null });
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

    const oldData = foodItem.toObject();

    await FoodItem.findOneAndUpdate(
      { _id: foodId, deletedAt: null },
      { $set: { isActive: false, isAvailable: false, deletedAt: new Date() } },
      { new: true }
    );

    await auditService.logAction({
      organizationId,
      branchId: branchId || foodItem.branchId,
      userId,
      action: 'DELETE_FOOD_ITEM',
      entityType: 'FoodItem',
      entityId: foodItem._id,
      oldValue: oldData,
    });

    return { message: 'Food item deleted successfully' };
  }
}

module.exports = new FoodService();
