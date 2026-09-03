const { Shift } = require('./shift.model');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class ShiftService {
  async startShift(userId, branchId, { startingCash = 0, notes = '' }) {
    // Check if user already has an open shift
    const existingOpenShift = await Shift.findOne({
      userId,
      branchId,
      status: 'OPEN',
    });

    // If shift already exists, return it (no error)
    if (existingOpenShift) {
      return existingOpenShift.populate('userId', 'name role email');
    }

    const shift = await Shift.create({
      userId,
      branchId,
      startedAt: new Date(),
      status: 'OPEN',
      startingCash,
      notes,
    });

    return shift.populate('userId', 'name role email');
  }

  async endShift(userId, branchId, { closingCash, notes = '' }) {
    const shift = await Shift.findOne({
      userId,
      branchId,
      status: 'OPEN',
    });

    // If no open shift exists, return success without error
    if (!shift) {
      return { status: 'CLOSED', userId, branchId, endedAt: new Date() };
    }

    shift.status = 'CLOSED';
    shift.endedAt = new Date();
    shift.closingCash = closingCash !== undefined ? closingCash : shift.startingCash;
    if (notes) {
      shift.notes = shift.notes ? `${shift.notes}\nClose Notes: ${notes}` : notes;
    }

    await shift.save();
    return shift.populate('userId', 'name role email');
  }

  async getActiveShift(userId, branchId) {
    const shift = await Shift.findOne({
      userId,
      branchId,
      status: 'OPEN',
    }).populate('userId', 'name role email');

    return shift; // May return null if no open shift
  }

  async getBranchShifts(branchId, { status, page = 1, limit = 20 }) {
    const filter = { branchId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      Shift.find(filter)
        .populate('userId', 'name role email')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit),
      Shift.countDocuments(filter),
    ]);

    return {
      shifts,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = new ShiftService();
