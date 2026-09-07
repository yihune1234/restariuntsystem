const express = require('express');
const adminSettingsController = require('./admin-settings.controller');
const { authenticateStaff } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/settings', authenticateStaff, adminSettingsController.getSettings);
router.put('/settings/branding', authenticateStaff, adminSettingsController.updateBranding);
router.put('/settings/credentials', authenticateStaff, adminSettingsController.updateCredentials);

module.exports = router;
