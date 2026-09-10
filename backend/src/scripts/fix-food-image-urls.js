/**
 * One-off repair script: clean up image URLs that were broken by two historical
 * bugs in the local-disk fallback upload path:
 *
 *   1. Food images were stored under the misspelled folder "restraunt" (rather
 *      than "restaurant"), so the URL path in MongoDB never matched the dir.
 *   2. Old local-fallback uploads baked an absolute host
 *      (e.g. https://farse-cafe.onrender.com/uploads/restraunt/foods/...) into
 *      every food's imageUrl. If the backend domain ever changes, every image
 *      breaks, and on ephemeral filesystems (Render) the disk copy disappears.
 *
 * This script rewrites both `imageUrl` and `imagePublicId` to the canonical,
 * host-agnostic relative path so URLs are correct regardless of host:
 *
 *     /uploads/restaurant/foods/<file>    (Food items)
 *     /uploads/restaurant/branding/<file> (Restaurant logo / cover)
 *
 * Run it from the backend directory:
 *
 *     npm run fix:images
 *
 * IMPORTANT: This script only repairs the MongoDB *paths*. If the physical files
 * were written to Render's ephemeral local disk (not Cloudinary), they are gone
 * and must be re-uploaded. With valid CLOUDINARY_* credentials configured, newly
 * uploaded images go to Cloudinary's CDN and are immune to backend restarts.
 */

const mongoose = require('mongoose');
const logger = require('../config/logger');
const { connectDB, disconnectDB } = require('../config/database');
const FoodItem = require('../modules/menu/food/food.model');
const Restaurant = require('../modules/restaurant/restaurant.model');

/**
 * Normalise an image URL to a canonical relative /uploads/... path.
 * Outer parentObjectId-like mutations are defensive.
 */
function canonicalise(value) {
  if (!value || typeof value !== 'string') return value;

  let url = value.trim();
  if (!url) return url;

  // Drop any scheme://host prefix so we keep only the path (host-agnostic).
  const hostMatch = url.match(/^https?:\/\/[^/]+/i);
  if (hostMatch) url = url.slice(hostMatch[0].length);
  if (!url.startsWith('/')) url = '/' + url;

  // Fix the misspelled folder name in the path.
  url = url.replace('/uploads/restraunt/', '/uploads/restaurant/');

  return url;
}

const applyTo = (doc, field) => {
  const current = doc.get ? doc.get(field) : doc[field];
  const next = canonicalise(current);
  if (current === next) return false;
  if (doc.set) doc.set(field, next);
  else doc[field] = next;
  return true;
};

const flush = async (batch, counter) => {
  if (!batch.length) return;
  await Promise.all(batch.map((d) => d.save()));
  counter[0] += batch.length;
  batch.length = 0;
};

async function main() {
  await connectDB();

  const foodsFixed = [0];
  const brandingFixed = [0];

  // --- Food items ---
  const foodBatch = [];
  const foodCursor = FoodItem.find({}).cursor();
  for (let doc = await foodCursor.next(); doc; doc = await foodCursor.next()) {
    const c1 = applyTo(doc, 'imageUrl');
    const c2 = applyTo(doc, 'imagePublicId');
    if (c1 || c2) {
      foodBatch.push(doc);
      if (foodBatch.length >= 200) await flush(foodBatch, foodsFixed);
    }
  }
  await flush(foodBatch, foodsFixed);

  // --- Restaurant branding (logoUrl / coverUrl) ---
  const brandBatch = [];
  const settingsCursor = Restaurant.find({}).cursor();
  for (let doc = await settingsCursor.next(); doc; doc = await settingsCursor.next()) {
    const c1 = applyTo(doc, 'logoUrl');
    const c2 = applyTo(doc, 'coverUrl');
    if (c1 || c2) {
      brandBatch.push(doc);
      if (brandBatch.length >= 200) await flush(brandBatch, brandingFixed);
    }
  }
  await flush(brandBatch, brandingFixed);

  logger.info(
    `Image URL repair complete: foods fixed=${foodsFixed[0]}, branding fixed=${brandingFixed[0]}`
  );

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error(`Image URL repair failed: ${err.message}`);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});