const multer = require('multer');
const { BadRequestError } = require('../utils/errors');

// Memory storage to hold file in memory buffer prior to streaming to Cloudinary
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Invalid file format '${file.mimetype}'. Only JPEG, PNG, and WEBP images are supported.`,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter,
});

module.exports = upload;
