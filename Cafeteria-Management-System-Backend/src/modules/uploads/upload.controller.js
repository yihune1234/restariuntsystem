const uploadService = require('./upload.service');
const foodService = require('../menu/food/food.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const config = require('../../config/env');
const { BadRequestError } = require('../../utils/errors');

/**
 * Local-fallback images are stored with a relative path (/uploads/...). Convert
 * that into an absolute URL the browser (and the separately-hosted frontend)
 * can load: prefer BACKEND_BASE_URL when provided, else the incoming request's
 * protocol + host. Cloudinary results are already absolute and pass through.
 */
function toAbsoluteUrl(imageUrl, req) {
  if (!imageUrl || /^https?:\/\//i.test(imageUrl)) return imageUrl;
  const base = config.backendBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}${imageUrl}`;
}

class UploadController {
  uploadFoodImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError('Please provide an image file (field name: image)', 'MISSING_IMAGE_FILE');
    }

    const { foodId } = req.params;

    // 1. Upload new image buffer (Cloudinary when configured, local disk otherwise)
    const uploadResult = await uploadService.uploadImageBuffer(
      req.file.buffer,
      `restaurants/branches/${req.user.branchId || 'general'}/foods`,
      req.file.mimetype
    );

    // 2. Persist an absolute, browser-ready imageUrl (Cloudinary results are
    //    already absolute; local /uploads/... paths are made absolute here) and
    //    keep imagePublicId as the storage key used for later deletion.
    const absoluteImageUrl = toAbsoluteUrl(uploadResult.imageUrl, req);
    const updatedFood = await foodService.updateFoodImage(foodId, {
      imageUrl: absoluteImageUrl,
      imagePublicId: uploadResult.imagePublicId,
    });

    return ApiResponse.success(res, 200, 'Food image uploaded successfully', {
      foodId: updatedFood._id,
      imageUrl: updatedFood.imageUrl,
      imagePublicId: updatedFood.imagePublicId,
    });
  });
}

module.exports = new UploadController();
