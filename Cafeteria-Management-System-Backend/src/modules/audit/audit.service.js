const { AuditLog } = require('./audit.model');

class AuditService {
  async logAction(data) {
    const {
      organizationId,
      branchId,
      userId,
      action,
      entityType,
      entityId,
      oldValue = null,
      newValue = null,
      ipAddress = '',
      userAgent = '',
    } = data;

    try {
      await AuditLog.create({
        organizationId,
        branchId,
        userId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Log errors but don't fail the main operation
      console.error('Failed to log audit action:', error);
    }
  }

  async getBranchAuditLogs(branchId, { action, entityType, userId, page = 1, limit = 50 }) {
    const filter = { branchId };

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name role email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = new AuditService();
