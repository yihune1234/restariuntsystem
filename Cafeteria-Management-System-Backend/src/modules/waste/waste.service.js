const mongoose = require('mongoose');
const { Waste, WASTE_REASONS } = require('./waste.model');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

class WasteService {
  /**
   * List waste records for a branch with optional filters + pagination.
   */
  async listWaste(branchId, { status, page = 1, limit = 20 } = {}) {
    const filter = { branchId: new mongoose.Types.ObjectId(branchId) };
    if (status && status !== 'all') {
      filter.status = String(status).toUpperCase();
    }

    const [items, total] = await Promise.all([
      Waste.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('recordedByUser', 'name')
        .populate('approvedByUser', 'name'),
      Waste.countDocuments(filter),
    ]);

    return {
      waste: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
      stats: {
        total: await Waste.countDocuments({ branchId: filter.branchId }),
        pending: await Waste.countDocuments({ branchId: filter.branchId, status: 'PENDING' }),
        approved: await Waste.countDocuments({ branchId: filter.branchId, status: 'APPROVED' }),
        rejected: await Waste.countDocuments({ branchId: filter.branchId, status: 'REJECTED' }),
      },
    };
  }

  /**
   * Record a new waste entry. Becomes PENDING until a Manager/Owner approves.
   */
  async recordWaste(organizationId, branchId, userId, payload) {
    if (!payload.itemName || !payload.itemName.trim()) {
      throw new BadRequestError('Item name is required', 'ITEM_NAME_REQUIRED');
    }
    const quantity = Number(payload.quantity);
    if (!quantity || quantity < 1) {
      throw new BadRequestError('Quantity must be at least 1', 'INVALID_QUANTITY');
    }
    if (!payload.reason || !WASTE_REASONS.includes(payload.reason)) {
      throw new BadRequestError(
        `Reason must be one of: ${WASTE_REASONS.join(', ')}`,
        'INVALID_WASTE_REASON'
      );
    }

    const waste = await Waste.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      branchId: new mongoose.Types.ObjectId(branchId),
      foodItemId: payload.foodItemId || null,
      itemName: payload.itemName.trim(),
      quantity,
      reason: payload.reason,
      notes: payload.notes || '',
      status: 'PENDING',
      estimatedCost: Number(payload.estimatedCost) || 0,
      recordedBy: userId,
    });

    return waste;
  }

  /**
   * Approve a pending waste record (Manager/Owner).
   */
  async approveWaste(wasteId, userId) {
    const waste = await Waste.findById(wasteId);
    if (!waste) throw new NotFoundError('Waste record not found', 'WASTE_NOT_FOUND');
    if (waste.status !== 'PENDING') {
      throw new BadRequestError('Only pending waste records can be approved', 'WASTE_NOT_PENDING');
    }
    waste.status = 'APPROVED';
    waste.approvedBy = userId;
    waste.approvedAt = new Date();
    await waste.save();
    return waste;
  }

  /**
   * Reject a pending waste record (Manager/Owner).
   */
  async rejectWaste(wasteId, userId, reason) {
    const waste = await Waste.findById(wasteId);
    if (!waste) throw new NotFoundError('Waste record not found', 'WASTE_NOT_FOUND');
    if (waste.status !== 'PENDING') {
      throw new BadRequestError('Only pending waste records can be rejected', 'WASTE_NOT_PENDING');
    }
    waste.status = 'REJECTED';
    waste.rejectedReason = reason || 'Rejected by manager';
    waste.approvedBy = userId;
    waste.approvedAt = new Date();
    await waste.save();
    return waste;
  }
}

module.exports = new WasteService();