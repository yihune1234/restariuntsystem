const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const { userRouter } = require('../modules/users/user.routes');
const {
  tableRouter,
  publicQrRouter,
} = require('../modules/tables/table.routes');
const customerSessionRoutes = require('../modules/customer-sessions/customer-session.routes');
const {
  categoryRouter,
} = require('../modules/menu/category/category.routes');
const {
  foodRouter,
} = require('../modules/menu/food/food.routes');
const { menuMealPeriodRouter } = require('../modules/menu/meal-period/menu.meal-period.routes');
const uploadRoutes = require('../modules/uploads/upload.routes');
const publicMenuController = require('../modules/menu/public-menu.controller');
const {
  orderRouter,
} = require('../modules/orders/order.routes');
const {
  paymentRouter,
  orderPaymentRouter,
} = require('../modules/payments/payment.routes');
const kitchenRoutes = require('../modules/kitchen/kitchen.routes');
const {
  reportRouter,
} = require('../modules/reports/report.routes');

const router = express.Router();

// 1. System Health
router.use('/', healthRoutes);

// 2. Public Endpoints (No Auth Required)
router.use('/public/qr', publicQrRouter);
router.get('/public/menu', publicMenuController.getPublicMenu);

// 3. Customer Sessions
router.use('/customer-sessions', customerSessionRoutes);

// 4. Staff Authentication
router.use('/auth', authRoutes);

// 5. Users/Employees
router.use('/users', userRouter);

// 6. Tables & QR
router.use('/tables', tableRouter);

// 7. Menu - Categories & Food Items
router.use('/categories', categoryRouter);
router.use('/food-items', uploadRoutes);
router.use('/food-items', foodRouter);
router.use('/meal-periods', menuMealPeriodRouter);

// 8. Orders & Order Payments
router.use('/orders/:orderId/payment', orderPaymentRouter);
router.use('/orders', orderRouter);

// 9. Payments & Webhooks
router.use('/payments', paymentRouter);

// 10. Kitchen
router.use('/kitchen', kitchenRoutes);

// 11. Reports
router.use('/reports', reportRouter);

module.exports = router;
