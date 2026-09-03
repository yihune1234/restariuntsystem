const mongoose = require('mongoose');
const OrganizationSettings = require('./organization-settings.model');
const auditService = require('../audit/audit.service');

class OrganizationSettingsService {
  async getSettings(organizationId) {
    let settings = await OrganizationSettings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!settings) {
      settings = await OrganizationSettings.create({
        organizationId: new mongoose.Types.ObjectId(organizationId),
      });
    }

    return settings;
  }

  async updateSettings(organizationId, updates, userId) {
    const oldSettings = await this.getSettings(organizationId);
    const oldValues = oldSettings.toObject();

    const allowedUpdates = [
      'currency',
      'timezone',
      'businessDays',
      'operatingHours',
      'defaultTaxRate',
      'defaultServiceChargeRate',
      'enabledPaymentMethods',
      'discountSettings',
      'refundSettings',
      'cancellationSettings',
      'writeOffSettings',
      'cashManagement',
      'orderSettings',
      'qrSettings',
      'notificationSettings',
      'fraudDetection',
      'isActive',
    ];

    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const settings = await OrganizationSettings.findOneAndUpdate(
      { organizationId: new mongoose.Types.ObjectId(organizationId) },
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!settings) {
      throw new Error('Settings not found');
    }

    await auditService.logAction({
      organizationId,
      userId,
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      entityType: 'OrganizationSettings',
      entityId: settings._id,
      oldValue: oldValues,
      newValue: settings.toObject(),
    });

    return settings;
  }

  async resetToDefaults(organizationId, userId) {
    const oldSettings = await this.getSettings(organizationId);
    const oldValues = oldSettings.toObject();

    await OrganizationSettings.deleteOne({ organizationId });

    const newSettings = await OrganizationSettings.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    await auditService.logAction({
      organizationId,
      userId,
      action: 'RESET_ORGANIZATION_SETTINGS',
      entityType: 'OrganizationSettings',
      entityId: newSettings._id,
      oldValue: oldValues,
      newValue: newSettings.toObject(),
    });

    return newSettings;
  }

  async validateDiscount(organizationId, discountPercent, userRole) {
    const settings = await this.getSettings(organizationId);
    const { maxDiscountPercent, managerMaxDiscountPercent } = settings.discountSettings;

    if (userRole === 'owner') {
      return { allowed: true };
    }

    if (userRole === 'manager') {
      if (discountPercent <= managerMaxDiscountPercent) {
        return { allowed: true };
      }
      if (discountPercent <= maxDiscountPercent) {
        return { allowed: true, requiresApproval: true };
      }
      return { allowed: false, reason: 'Discount exceeds manager maximum' };
    }

    if (discountPercent <= managerMaxDiscountPercent / 2) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Employee discount limit exceeded' };
  }

  async validateRefund(organizationId, amount) {
    const settings = await this.getSettings(organizationId);
    const { requiresManagerApprovalAbove, requiresOwnerApprovalAbove } = settings.refundSettings;

    if (amount >= requiresOwnerApprovalAbove) {
      return { allowed: true, requiresOwnerApproval: true };
    }

    if (amount >= requiresManagerApprovalAbove) {
      return { allowed: true, requiresManagerApproval: true };
    }

    return { allowed: true };
  }

  async validateCancellation(organizationId, orderStatus) {
    const settings = await this.getSettings(organizationId);
    const { allowCancellationAfterPrep, allowCancellationAfterDelivery } = settings.cancellationSettings;

    if (orderStatus === 'PREPARING' && !allowCancellationAfterPrep) {
      return { allowed: false, reason: 'Cancellation not allowed after preparation starts' };
    }

    if (orderStatus === 'DELIVERED' && !allowCancellationAfterDelivery) {
      return { allowed: false, reason: 'Cancellation not allowed after delivery' };
    }

    return { allowed: true };
  }

  async validateCashDifference(organizationId, difference) {
    const settings = await this.getSettings(organizationId);
    const { allowNegativeDifference, maxCashDifference } = settings.cashManagement;

    if (!allowNegativeDifference && difference < 0) {
      return { allowed: false, reason: 'Negative cash differences are not allowed' };
    }

    if (Math.abs(difference) > maxCashDifference) {
      return { allowed: true, requiresExplanation: true };
    }

    return { allowed: true };
  }

  async getPaymentMethods(organizationId) {
    const settings = await this.getSettings(organizationId);
    const methods = [];

    if (settings.enabledPaymentMethods.cash) {
      methods.push({ id: 'CASH', name: 'Cash', provider: 'CASHIER_CASH' });
    }
    if (settings.enabledPaymentMethods.card) {
      methods.push({ id: 'CARD', name: 'Card', provider: 'CASHIER_CARD' });
    }
    if (settings.enabledPaymentMethods.Chapa) {
      methods.push({ id: 'CHAPA', name: 'Chapa', provider: 'CHAPA' });
    }
    if (settings.enabledPaymentMethods.Telebirr) {
      methods.push({ id: 'TELEBIRR', name: 'Telebirr', provider: 'TELEBIRR' });
    }
    if (settings.enabledPaymentMethods.bankTransfer) {
      methods.push({ id: 'BANK_TRANSFER', name: 'Bank Transfer', provider: 'CASHIER_BANK_TRANSFER' });
    }

    return methods;
  }
}

module.exports = new OrganizationSettingsService();