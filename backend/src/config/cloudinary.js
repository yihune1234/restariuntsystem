const cloudinary = require('cloudinary').v2;
const config = require('./env');
const logger = require('./logger');

const PLACEHOLDER_PATTERN = /^your_|^<|^placeholder$|^changeme$/i;

/**
 * True only when real Cloudinary credentials are present (i.e. the values are
 * non-empty AND are not the seeded placeholders). When this is false the
 * upload service transparently falls back to local disk storage so image
 * uploads keep working out of the box in development / self-hosted setups.
 */
function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) return false;
  return !PLACEHOLDER_PATTERN.test(cloudName) &&
         !PLACEHOLDER_PATTERN.test(apiKey) &&
         !PLACEHOLDER_PATTERN.test(apiSecret);
}

const cloudinaryReady = isCloudinaryConfigured();

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary configured successfully');
} else {
  logger.warn(
    'Cloudinary credentials missing or placeholders. Falling back to LOCAL disk storage for image uploads ' +
    '(files served from /uploads). Set real CLOUDINARY_* values to use Cloudinary.'
  );
}

module.exports = cloudinary;
module.exports.isCloudinaryConfigured = () => cloudinaryReady;
module.exports.cloudinaryReady = cloudinaryReady;
