const mongoose = require('mongoose');
const { CustomerFeedback } = require('./customer-feedback.model');
const auditService = require('../audit/audit.service');

class CustomerFeedbackService {
  async createFeedback(data) {
    // Derive the feedback kind when not supplied: complaint for low ratings or
    // explicit complaint flag, idea when a suggestion is present, else rating.
    let type = data.type;
    if (!['RATING', 'IDEA', 'COMPLAINT'].includes(type)) {
      if (data.isComplaint || (data.overallRating !== undefined && data.overallRating <= 2)) {
        type = 'COMPLAINT';
      } else if (data.suggestionText && !data.overallRating) {
        type = 'IDEA';
      } else {
        type = 'RATING';
      }
    }

    const feedback = await CustomerFeedback.create({
      organizationId: new mongoose.Types.ObjectId(data.organizationId),
      branchId: new mongoose.Types.ObjectId(data.branchId),
      orderId: data.orderId ? new mongoose.Types.ObjectId(data.orderId) : null,
      customerSessionId: data.customerSessionId ? new mongoose.Types.ObjectId(data.customerSessionId) : null,
      tableId: data.tableId ? new mongoose.Types.ObjectId(data.tableId) : null,
      overallRating: data.overallRating,
      foodRating: data.foodRating,
      serviceRating: data.serviceRating,
      cleanlinessRating: data.cleanlinessRating,
      waitTimeRating: data.waitTimeRating,
      feedbackText: data.feedbackText || '',
      suggestionText: data.suggestionText || '',
      type,
      isComplaint: type === 'COMPLAINT',
      status: type === 'COMPLAINT' ? 'OPEN' : 'RESOLVED',
      isResolved: type !== 'COMPLAINT',
      source: data.source || 'QR_CODE',
    });

    await auditService.logAction({
      organizationId: data.organizationId,
      branchId: data.branchId,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'CustomerFeedback',
      entityId: feedback._id,
      newValue: { overallRating: data.overallRating, isComplaint: feedback.isComplaint },
    });

    return feedback;
  }

  async resolveFeedback(feedbackId, resolvedBy, resolutionNotes) {
    const feedback = await CustomerFeedback.findByIdAndUpdate(
      feedbackId,
      {
        isResolved: true,
        status: 'RESOLVED',
        resolvedBy: new mongoose.Types.ObjectId(resolvedBy),
        resolvedAt: new Date(),
        resolutionNotes,
      },
      { new: true }
    );

    if (feedback) {
      await auditService.logAction({
        organizationId: feedback.organizationId,
        branchId: feedback.branchId,
        userId: resolvedBy,
        action: 'COMPLAINT_RESOLVED',
        entityType: 'CustomerFeedback',
        entityId: feedback._id,
        oldValue: { isResolved: false },
        newValue: { isResolved: true, status: 'RESOLVED', resolutionNotes },
      });
    }

    return feedback;
  }

  /**
   * Transition a feedback item's lifecycle status (OPEN -> INVESTIGATING ->
   * RESOLVED -> CLOSED). Any new status other than CLOSED keeps the item
   * "open"; RESOLVED and CLOSED mark it resolved.
   */
  async updateFeedbackStatus(feedbackId, actorId, { status }) {
    const allowed = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`);
    }

    const feedback = await CustomerFeedback.findById(feedbackId);
    if (!feedback) return null;

    const previous = feedback.status;
    feedback.status = status;
    feedback.isResolved = status === 'RESOLVED' || status === 'CLOSED';
    if (feedback.isResolved) {
      feedback.resolvedBy = new mongoose.Types.ObjectId(actorId);
      feedback.resolvedAt = new Date();
    }
    await feedback.save();

    await auditService.logAction({
      organizationId: feedback.organizationId,
      branchId: feedback.branchId,
      userId: actorId,
      action: 'COMPLAINT_RESOLVED',
      entityType: 'CustomerFeedback',
      entityId: feedback._id,
      oldValue: { status: previous, isResolved: previous === 'RESOLVED' || previous === 'CLOSED' },
      newValue: { status: feedback.status, isResolved: feedback.isResolved },
    });

    return feedback;
  }

  async getBranchFeedback(branchId, { page = 1, limit = 20, includeResolved = false }) {
    const filter = { branchId: new mongoose.Types.ObjectId(branchId) };
    
    if (!includeResolved) {
      filter.isResolved = false;
    }

    const skip = (page - 1) * limit;

    const [feedbacks, total] = await Promise.all([
      CustomerFeedback.find(filter)
        .populate('orderId', 'orderNumber total')
        .populate('resolvedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CustomerFeedback.countDocuments(filter),
    ]);

    return {
      feedbacks,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrganizationFeedback(organizationId, { page = 1, limit = 20, branchId = null }) {
    const filter = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    
    if (branchId) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const skip = (page - 1) * limit;

    const [feedbacks, total] = await Promise.all([
      CustomerFeedback.find(filter)
        .populate('branchId', 'name')
        .populate('orderId', 'orderNumber total')
        .populate('resolvedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CustomerFeedback.countDocuments(filter),
    ]);

    return {
      feedbacks,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFeedbackStats(branchId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats, recentComplaints] = await Promise.all([
      CustomerFeedback.aggregate([
        {
          $match: {
            branchId: new mongoose.Types.ObjectId(branchId),
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalFeedback: { $sum: 1 },
            avgOverallRating: { $avg: '$overallRating' },
            avgFoodRating: { $avg: '$foodRating' },
            avgServiceRating: { $avg: '$serviceRating' },
            avgCleanlinessRating: { $avg: '$cleanlinessRating' },
            avgWaitTimeRating: { $avg: '$waitTimeRating' },
            complaintCount: { $sum: { $cond: ['$isComplaint', 1, 0] } },
            resolvedComplaints: { $sum: { $cond: ['$isResolved', 1, 0] } },
            openComplaints: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
            investigatingComplaints: { $sum: { $cond: [{ $eq: ['$status', 'INVESTIGATING'] }, 1, 0] } },
            closedComplaints: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          },
        },
      ]),
      CustomerFeedback.find({
        branchId: new mongoose.Types.ObjectId(branchId),
        isComplaint: true,
        isResolved: false,
        createdAt: { $gte: startDate },
      })
        .populate('orderId', 'orderNumber total')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const ratingDistribution = await CustomerFeedback.aggregate([
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$overallRating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period: { days, startDate: startDate.toISOString() },
      stats: stats[0] || {
        totalFeedback: 0,
        avgOverallRating: 0,
        avgFoodRating: 0,
        avgServiceRating: 0,
        avgCleanlinessRating: 0,
        avgWaitTimeRating: 0,
        complaintCount: 0,
        resolvedComplaints: 0,
        openComplaints: 0,
        investigatingComplaints: 0,
        closedComplaints: 0,
      },
      ratingDistribution,
      recentComplaints,
    };
  }

  /**
   * OWNER: complete feedback analytics across an organization (optionally one
   * branch). Averages, positive/negative percentages, idea counts, complaint
   * stats and a per-day rating trend for charting.
   */
  async getOrganizationAnalytics(organizationId, { days = 30, branchId = null } = {}) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const match = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: startDate },
    };
    if (branchId) {
      match.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const [summaryAgg, typeAgg, trendAgg, distribution] = await Promise.all([
      CustomerFeedback.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgOverall: { $avg: '$overallRating' },
            avgFood: { $avg: '$foodRating' },
            avgService: { $avg: '$serviceRating' },
            avgCleanliness: { $avg: '$cleanlinessRating' },
            avgWaitTime: { $avg: '$waitTimeRating' },
            positive: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$overallRating', null] }, { $gte: ['$overallRating', 4] }] },
                  1,
                  0,
                ],
              },
            },
            negative: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ['$overallRating', null] }, { $lte: ['$overallRating', 2] }] },
                  1,
                  0,
                ],
              },
            },
            ideas: { $sum: { $cond: [{ $eq: ['$type', 'IDEA'] }, 1, 0] } },
            complaints: { $sum: { $cond: [{ $eq: ['$type', 'COMPLAINT'] }, 1, 0] } },
            openComplaints: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'COMPLAINT'] }, { $eq: ['$isResolved', false] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      CustomerFeedback.aggregate([
        { $match: { ...match, type: 'IDEA' } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        {
          $project: {
            suggestionText: 1,
            feedbackText: 1,
            branchId: 1,
            createdAt: 1,
            isResolved: 1,
          },
        },
      ]),
      CustomerFeedback.aggregate([
        { $match: { ...match, overallRating: { $ne: null } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            avgOverall: { $avg: '$overallRating' },
            avgFood: { $avg: '$foodRating' },
            avgService: { $avg: '$serviceRating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CustomerFeedback.aggregate([
        { $match: { ...match, overallRating: { $ne: null } } },
        { $group: { _id: '$overallRating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const s = summaryAgg[0] || {
      totalReviews: 0,
      avgOverall: 0,
      avgFood: 0,
      avgService: 0,
      avgCleanliness: 0,
      avgWaitTime: 0,
      positive: 0,
      negative: 0,
      ideas: 0,
      complaints: 0,
      openComplaints: 0,
    };

    const ratedCount = Math.max(0, s.totalReviews - (s.ideas || 0));
    const percent = (n) => (ratedCount > 0 ? Math.round((n / ratedCount) * 1000) / 10 : 0);

    return {
      period: { days, startDate: startDate.toISOString(), branchId },
      summary: {
        totalReviews: s.totalReviews,
        overallRating: Math.round((s.avgOverall || 0) * 10) / 10,
        foodRating: Math.round((s.avgFood || 0) * 10) / 10,
        serviceRating: Math.round((s.avgService || 0) * 10) / 10,
        cleanlinessRating: Math.round((s.avgCleanliness || 0) * 10) / 10,
        waitTimeRating: Math.round((s.avgWaitTime || 0) * 10) / 10,
        positivePercent: percent(s.positive),
        negativePercent: percent(s.negative),
        ideas: s.ideas || 0,
        complaints: s.complaints || 0,
        openComplaints: s.openComplaints || 0,
      },
      ideas: typeAgg,
      trend: trendAgg,
      ratingDistribution: distribution,
    };
  }
}

module.exports = new CustomerFeedbackService();