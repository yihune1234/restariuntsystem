const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const { userRouter } = require('../modules/users/user.routes');
const {
  categoryRouter,
} = require('../modules/menu/category/category.routes');
const {
  foodRouter,
} = require('../modules/menu/food/food.routes');
const {
  mealPeriodRouter,
} = require('../modules/menu/meal-period/meal-period.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const publicMenuController = require('../modules/menu/public-menu.controller');
const adminSettingsRoutes = require('../modules/admin-settings/admin-settings.routes');

const router = express.Router();

router.use('/', healthRoutes);

router.get('/public/menu', publicMenuController.getPublicMenu);

router.use('/auth', authRoutes);
router.use('/users', userRouter);
router.use('/categories', categoryRouter);
router.use('/meal-periods', mealPeriodRouter);
router.use('/food-items', foodRouter);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminSettingsRoutes);

module.exports = router;
