const mongoose = require('mongoose');
const { getTodayBusinessDate } = require('./date');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Format: "order_seq_<branchId>_<YYYY-MM-DD>"
  seq: { type: Number, default: 1000 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Generate a sequential order number scoped to branch and date (e.g. #1001, #1002)
 * @param {string} branchId
 * @param {import('mongoose').ClientSession} [session]
 * @returns {Promise<string>}
 */
const generateOrderNumber = async (branchId, session = null) => {
  const businessDate = getTodayBusinessDate();
  const counterId = `order_seq_${branchId}_${businessDate}`;

  const query = Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (session) {
    query.session(session);
  }

  const counter = await query;
  return `#${counter.seq}`;
};

module.exports = {
  generateOrderNumber,
  Counter,
};
