const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../../config/cloudinary');
const { isCloudinaryConfigured } = require('../../config/cloudinary');
const config = require('../../config/env');
const { BadRequestError } = require('../../utils/errors');
const logger = require('../../config/logger');

// Local fallback storage root (used when Cloudinary is not configured).
const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/** Map an uploaded mimetype to a safe file extension. */
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function publicBaseUrl() {
  // Base URL used to build publicly reachable image URLs for local files.
  const base = config.clientUrl || '';
  return base ? `${base.replace(/\/$/, '')}/uploads` : '/uploads';
}

class UploadService {
  /**
   * Store an image buffer. Uses Cloudinary when real credentials exist;
   * otherwise writes the file to ./uploads and serves it via /uploads/*.
   * @param {Buffer} buffer - File buffer from multer
   * @param {string} folder - Destination folder (Cloudinary) / subfolder hint
   * @param {string} [mimetype] - Uploaded mimetype (local fallback naming)
   * @returns {Promise<{ imageUrl: string, imagePublicId: string }>}
   */
  async uploadImageBuffer(buffer, folder = 'restaurant/foods', mimetype = 'image/jpeg') {
    if (!buffer) {
      throw new BadRequestError('No image buffer provided for upload', 'NO_FILE_PROVIDED');
    }

    if (isCloudinaryConfigured()) {
      try {
        return await this.uploadToCloudinary(buffer, folder);
      } catch (err) {
        // If Cloudinary rejects the account (e.g. invalid cloud_name), do not
        // fail the whole upload — transparently fall back to local storage so
        // image uploads keep working while credentials are corrected.
        if (err && err.code === 'CLOUDINARY_UPLOAD_ERROR') {
          logger.warn(`Cloudinary upload failed (${err.message}). Falling back to local disk storage.`);
          return this.saveLocally(buffer, folder, mimetype);
        }
        throw err;
      }
    }
    return this.saveLocally(buffer, folder, mimetype);
  }

  /** Cloudinary path (unchanged behaviour). */
  uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(new BadRequestError(`Image upload failed: ${error.message}`, 'CLOUDINARY_UPLOAD_ERROR'));
          }

          resolve({
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Local disk fallback: writes <uploads>/<folder-ish>/<random>.<ext> and
   * returns a URL that the backend serves from the /uploads static route.
   */
  async saveLocally(buffer, folder, mimetype = 'image/jpeg') {
    try {
      // Sanitize the Cloudinary-style folder (e.g. "restaurants/branches/x/foods")
      // into safe sub-directories under ./uploads.
      const safeSegments = String(folder)
        .split('/')
        .map((s) => s.replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(Boolean)
        .slice(-2); // keep it shallow: last two segments only
      const dir = path.join(LOCAL_UPLOAD_DIR, ...safeSegments);
      await fs.promises.mkdir(dir, { recursive: true });

      const ext = EXT_BY_MIME[mimetype] || '.jpg';
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const filePath = path.join(dir, filename);
      await fs.promises.writeFile(filePath, buffer);

      const relativeUrl = `/uploads/${[...safeSegments, filename].join('/')}`;
      logger.info(`Image stored locally: ${filePath}`);

      return {
        imageUrl: relativeUrl,
        // "publicId" doubles as the local relative path so deletion works too.
        imagePublicId: relativeUrl,
      };
    } catch (err) {
      logger.error(`Local image save failed: ${err.message}`);
      throw new BadRequestError('Image upload failed', 'IMAGE_SAVE_ERROR');
    }
  }

  /**
   * Delete image from Cloudinary (or from local disk when the id is a local path).
   */
  async deleteImage(publicId) {
    if (!publicId) return;
    try {
      // Local files are identified by their /uploads/... relative path.
      if (publicId.startsWith('/uploads/')) {
        const localPath = path.join(LOCAL_UPLOAD_DIR, publicId.replace(/^\/uploads\//, ''));
        // Prevent path traversal outside the uploads root.
        if (!localPath.startsWith(LOCAL_UPLOAD_DIR)) return;
        await fs.promises.unlink(localPath);
        logger.info(`Local image deleted: ${localPath}`);
        return;
      }
      const res = await cloudinary.uploader.destroy(publicId);
      logger.info(`Cloudinary image deleted: ${publicId} - result: ${res.result}`);
      return res;
    } catch (error) {
      logger.warn(`Failed to delete image: ${error.message}`);
    }
  }
}

module.exports = new UploadService();
