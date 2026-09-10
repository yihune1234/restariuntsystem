const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const cloudinary = require('../config/cloudinary');
const FoodItem = require('../modules/menu/food/food.model');

const LOCAL_URL_PREFIXES = [
  'http://localhost:5000/uploads/',
  'http://localhost:3000/uploads/',
  '/uploads/',
];

function isLocalUrl(url) {
  if (!url) return false;
  return LOCAL_URL_PREFIXES.some((prefix) => url.startsWith(prefix)) || /^https?:\/\/.*\/uploads\//i.test(url);
}

async function uploadLocalToCloudinary(localUrl) {
  // Extract the relative /uploads/... path
  const match = localUrl.match(/(\/uploads\/.+)$/);
  if (!match) throw new Error(`Could not extract local path from URL: ${localUrl}`);
  const relativePath = match[1];
  const localPath = path.resolve(__dirname, '../../..', relativePath);

  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }

  const buffer = fs.readFileSync(localPath);

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'restaurant/foods', resource_type: 'image', overwrite: false, unique_filename: true },
      (err, result) => {
        if (err) return reject(err);
        resolve({ imageUrl: result.secure_url, imagePublicId: result.public_id });
      }
    ).end(buffer);
  });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find all food items with local image URLs
  const foods = await FoodItem.find({
    $or: [
      { imageUrl: { $regex: '^https?://.*/uploads/', $options: 'i' } },
      { imageUrl: { $regex: '^/uploads/' } },
      { imageUrl: { $regex: 'localhost.*uploads', $options: 'i' } },
    ],
    deletedAt: null,
  });

  console.log(`Found ${foods.length} food items with local image URLs`);

  let success = 0;
  let failed = 0;

  for (const food of foods) {
    try {
      console.log(`Processing "${food.nameEn || food.name}" (${food._id})...`);
      const oldUrl = food.imageUrl;
      const result = await uploadLocalToCloudinary(oldUrl);

      food.imageUrl = result.imageUrl;
      food.imagePublicId = result.imagePublicId;
      await food.save();

      console.log(`  ✓ Uploaded: ${result.imageUrl}`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed for "${food.nameEn || food.name}": ${err.message}`);
      failed++;
    }
  }

  console.log(`\nMigration complete: ${success} succeeded, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Migration script error:', err);
  process.exit(1);
});
