/**
 * Apply a mapping of food items -> Cloudinary image URLs to MongoDB.
 *
 * Intended for repairing food images that were previously stored via the local
 * disk fallback (URLs like /uploads/restraunt/foods/... that now 404 because the
 * ephemeral Render disk was wiped). If the real images live in a Cloudinary
 * account, provide a mapping and this script updates imageUrl/imagePublicId.
 *
 * Matching precedence for each entry key:
 *   1. exact match on _id (if the key is a 24-char hex ObjectId)
 *   2. case-insensitive match on `name` or `nameEn`
 *   3. match by the current imagePublicId OR imageUrl filename (basename)
 *
 * Mapping file: JSON array of:
 *   [
 *     { "key": "Lemon Tea", "imageUrl": "https://res.cloudinary.com/xxx/...jpg",
 *       "imagePublicId": "restaurant/foods/lemon-tea" }
 *   ]
 *
 * Run it from the backend directory:
 *     node src/scripts/apply-image-mapping.js /absolute/path/to/mapping.json
 *   or with dry-run (no writes):
 *     node src/scripts/apply-image-mapping.js /path/mapping.json --dry-run
 */

const path = require('path');
const logger = require('../config/logger');
const { connectDB, disconnectDB } = require('../config/database');
const FoodItem = require('../modules/menu/food/food.model');

const mappingPath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!mappingPath) {
  console.error('Usage: node src/scripts/apply-image-mapping.js <mapping.json> [--dry-run]');
  process.exit(1);
}

function parseMapping(file) {
  const raw = require('fs').readFileSync(file, 'utf8');
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error('Mapping file must be a JSON array');
  return arr;
}

async function main() {
  const mapping = parseMapping(mappingPath);
  logger.info(`Loaded ${mapping.length} mapping entries (dry-run=${dryRun})`);

  await connectDB();
  const allFood = await FoodItem.find({});
  const byId = new Map(allFood.map((d) => [String(d._id), d]));
  const byName = new Map();
  allFood.forEach((d) => {
    byName.set(String(d.name || '').trim().toLowerCase(), d);
    byName.set(String(d.nameEn || '').trim().toLowerCase(), d);
  });
  const byFile = new Map();
  allFood.forEach((d) => {
    const file = (d.imagePublicId || d.imageUrl || '').split('/').pop();
    if (file) byFile.set(file, d);
  });

  const matched = [];
  const noMatch = [];

  for (const entry of mapping) {
    const { key, imageUrl, imagePublicId } = entry;
    const keyStr = String(key || '').trim();
    if (!keyStr) {
      noMatch.push({ key: '(empty)', reason: 'empty key' });
      continue;
    }

    let doc = null;
    // 1. ObjectId exact
    if (/^[0-9a-f]{24}$/i.test(keyStr)) doc = byId.get(keyStr);
    // 2. name / nameEn
    if (!doc) doc = byName.get(keyStr.toLowerCase());
    // 3. filename
    if (!doc) doc = byFile.get(keyStr);

    if (!doc) {
      noMatch.push({ key: keyStr, reason: 'no food matched' });
      continue;
    }

    matched.push({ doc, imageUrl, imagePublicId });
  }

  logger.info(`Matched ${matched.length} entries, unmatched ${noMatch.length}`);
  noMatch.forEach((n) => logger.warn(`  Unmatched: "${n.key}" (${n.reason})`));

  if (dryRun) {
    matched.forEach(({ doc, imageUrl, imagePublicId }) => {
      logger.info(`  [dry] would set "${doc.name || doc.nameEn}" -> ${imageUrl}`);
    });
    await disconnectDB();
    process.exit(0);
  }

  // Save in batches.
  let saved = 0;
  const batch = [];
  for (const { doc, imageUrl, imagePublicId } of matched) {
    if (imageUrl !== undefined) doc.set('imageUrl', imageUrl);
    if (imagePublicId !== undefined) doc.set('imagePublicId', imagePublicId);
    batch.push(doc);
    if (batch.length >= 100) {
      await Promise.all(batch.map((d) => d.save()));
      saved += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length) {
    await Promise.all(batch.map((d) => d.save()));
    saved += batch.length;
  }

  logger.info(`Applied image mapping to ${saved} food items.`);
  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error(`apply-image-mapping failed: ${err.message}`);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});